import crypto from "crypto";
import { Request, Response } from "express";
import HealthCenter from "../models/HealthCenter";
import Region from "../models/Region";
import User from "../models/User";
import { sendInvitationEmail } from "../utils/mailer";

// ✅ GET tous les utilisateurs
export const getUsers = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const query: any = {};
    const scope = (req.query.scope as string) || "";

    if (currentUser.role === "regional") {
      // Le régional voit uniquement les agents de niveau district de sa région
      query.region = currentUser.region;
      query.role = "district"; // Uniquement les utilisateurs avec le rôle "district"
    } else if (currentUser.role === "district") {
      // 🏛️ District : peut voir les agents de toutes les structures de son district
      // On doit chercher tous les centres qui appartiennent au district
      const centers = await HealthCenter.find({
        region: currentUser.region,
        districtName: currentUser.healthCenter, // Le healthCenter du district est son nom
      }).select("name");
      
      const centerNames = centers.map((c) => c.name);
      
      query.role = "agent";
      query.region = currentUser.region;
      query.healthCenter = { $in: centerNames }; // Tous les centres du district
    } else if (currentUser.role === "agent") {
      // 🏥 Agent de district : peut voir les admins des structures de son district
      // Ancienne génération d'agents sans agentLevel explicite : considérés comme district
      if (
        (!currentUser.agentLevel || currentUser.agentLevel === "district") &&
        scope === "admins"
      ) {
        if (!currentUser.region || !currentUser.healthCenter) {
          return res.status(400).json({
            error:
              "Contexte district incomplet (région ou centre de référence manquant).",
          });
        }

        const centers = await HealthCenter.find({
          region: currentUser.region,
          districtName: currentUser.healthCenter,
        }).select("name");

        const centerNames = centers.map((c) => c.name);

        if (centerNames.length === 0) {
          return res.json({ message: "Liste des utilisateurs", data: [] });
        }

        query.role = "agent";
        query.region = currentUser.region;
        query.healthCenter = { $in: centerNames };
        (query as any).agentLevel = "facility_admin";
      }
      // 👨‍⚕️ Admin d'acteur : peut voir son équipe interne
      // Gère aussi les anciens agents sans agentLevel (traités comme facility_admin)
      else if ((currentUser.agentLevel === "facility_admin" || !currentUser.agentLevel) && scope === "staff") {
        query.role = "agent";
        query.region = currentUser.region;
        query.healthCenter = currentUser.healthCenter;
        (query as any).agentLevel = "facility_staff";
      } else {
        // Comportement historique : un agent voit uniquement son propre compte
        query._id = currentUser.id;
      }
    }

    const users = await User.find(query).select("-password");
    res.json({ message: "Liste des utilisateurs", data: users });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ✅ GET utilisateur par ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ✅ CREATE utilisateur
export const createUser = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    let { email, role, region, healthCenter, firstName, lastName, phone } = req.body;

    console.log('\n🔍 === DEBUG createUser ===');
    console.log('Current User ID:', currentUser.id);
    console.log('Current User Email:', currentUser.email);
    console.log('Current User Role:', currentUser.role);
    console.log('Current User AgentLevel:', currentUser.agentLevel);
    console.log('Current User HealthCenter:', currentUser.healthCenter);
    console.log('Current User Region:', currentUser.region);
    console.log('Body - Role demandé:', role);
    console.log('Body - HealthCenter demandé:', healthCenter);
    console.log('Body - Region demandé:', region);

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Cet email est déjà utilisé" });

    // 🏛️ Cas 1 : National → crée des régionaux
    if (currentUser.role === "national") {
      if (role !== "regional")
        return res.status(403).json({ error: "Un national ne peut créer que des régionaux." });

      if (!region)
        return res.status(400).json({ error: "Un régional doit être lié à une région." });

      const existingRegion = await Region.findOne({ name: region });
      if (!existingRegion)
        return res.status(400).json({ error: `La région '${region}' n'existe pas.` });

      const regionalInRegion = await User.findOne({ role: "regional", region });
      if (regionalInRegion)
        return res.status(409).json({ error: `Un régional existe déjà pour '${region}'.` });
    }

    // 🌍 Cas 2 : Régional → crée des Districts
    else if (currentUser.role === "regional") {
      if (role !== "district")
        return res.status(403).json({ error: "Un régional ne peut créer que des districts." });

      region = currentUser.region;

      if (!healthCenter)
        return res.status(400).json({ error: "Un district doit être lié à un centre de santé." });

      const center = await HealthCenter.findOne({ name: healthCenter, region });
      if (!center)
        return res
          .status(400)
          .json({ error: `Le centre '${healthCenter}' n'existe pas dans '${region}'.` });

      // Vérifier qu'il n'existe pas déjà un district pour ce centre
      const existingDistrict = await User.findOne({ role: "district", region, healthCenter });
      if (existingDistrict)
        return res.status(409).json({ error: `Un district existe déjà pour '${healthCenter}'.` });
    }

    // 🏯 Cas 3 : District → crée des Agents (acteurs de santé)
    else if (currentUser.role === "district") {
      if (role !== "agent")
        return res.status(403).json({ error: "Un district ne peut créer que des agents." });

      region = currentUser.region;

      if (!healthCenter)
        return res.status(400).json({ error: "Un admin doit être lié à un centre/acteur." });

      const center = await HealthCenter.findOne({ name: healthCenter, region });
      if (!center)
        return res
          .status(400)
          .json({ error: `Le centre/acteur '${healthCenter}' n'existe pas dans '${region}'.` });

      // Un seul admin par acteur
      const existingAdmin = await User.findOne({
        role: "agent",
        region,
        healthCenter,
        agentLevel: "facility_admin",
      } as any);
      if (existingAdmin)
        return res
          .status(409)
          .json({ error: `Un admin existe déjà pour l'acteur '${healthCenter}'.` });

      (req as any)._resolvedAgentLevel = "facility_admin";
    }

    // 👨‍⚕️ Cas 4 : Admin d'acteur → crée des agents internes (facility_staff)
    // Gère aussi les anciens agents sans agentLevel qui ont été créés par un district
    else if (currentUser.role === "agent" && 
             (currentUser.agentLevel === "facility_admin" || !currentUser.agentLevel)) {
      console.log('✅ Cas 4 détecté : Agent facility_admin (ou ancien agent sans agentLevel)');
      console.log('   AgentLevel actuel:', currentUser.agentLevel || 'undefined (traité comme facility_admin)');
      
      if (role !== "agent") {
        console.log('❌ Erreur : Role demandé n\'est pas "agent"');
        return res
          .status(403)
          .json({ error: "Un admin d'acteur ne peut créer que des agents internes." });
      }

      // On force l'agent interne à rester dans la même région/acteur que son admin
      region = currentUser.region;
      healthCenter = currentUser.healthCenter;

      console.log('✅ Région forcée:', region);
      console.log('✅ HealthCenter forcé:', healthCenter);

      if (!healthCenter || !region) {
        console.log('❌ Erreur : HealthCenter ou Region manquant');
        return res.status(400).json({ error: "Contexte d'acteur invalide pour l'admin." });
      }

      (req as any)._resolvedAgentLevel = "facility_staff";
      console.log('✅ AgentLevel résolu : facility_staff');
    }

    // 🚫 Tous les autres rôles ne peuvent pas créer d'utilisateurs
    else {
      console.log('❌ Aucun cas ne correspond !');
      console.log('   - currentUser.role:', currentUser.role);
      console.log('   - currentUser.agentLevel:', currentUser.agentLevel);
      console.log('   - Condition agent + facility_admin:', currentUser.role === "agent" && currentUser.agentLevel === "facility_admin");
      return res.status(403).json({ error: "Permissions insuffisantes." });
    }

    // 🔐 Création avec token d'invitation OU mot de passe direct (pour tests)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const { password } = req.body;

    const user = new User({
      email,
      password: password || undefined, // Si password fourni, il sera hashé par le hook pre('save')
      role,
      region,
      healthCenter,
      firstName,
      lastName,
      phone,
      // Niveau d'agent résolu plus haut si applicable
      agentLevel: (req as any)._resolvedAgentLevel,
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    await user.save();

    try {
      await sendInvitationEmail(email, token, role, region, healthCenter);
    } catch (err) {
      console.error("❌ Erreur envoi email:", (err as any).message);
    }

    res.status(201).json({ message: "Utilisateur créé avec succès", user: user.toJSON() });
  } catch (err: any) {
    res.status(400).json({ error: "Impossible de créer l'utilisateur", details: err.message });
  }
};

// ✅ UPDATE utilisateur (général)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const updates = req.body;
    const targetUserId = req.params.id;

    console.log("🔄 Tentative de mise à jour utilisateur:", {
      currentUserId: currentUser.id,
      currentUserRole: currentUser.role,
      targetUserId,
      updates
    });

    // ✅ Tout utilisateur peut modifier son propre profil
    if (currentUser.id === targetUserId) {
      console.log("✅ Utilisateur modifie son propre profil");
      const user = await User.findByIdAndUpdate(targetUserId, updates, { new: true }).select(
        "-password"
      );

      if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

      return res.json({ message: "Profil mis à jour avec succès", user });
    }

    // ✅ Règles pour modifier d'autres utilisateurs
    if (currentUser.role === "regional") {
      const target = await User.findById(targetUserId);
      if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });
      if (target.role !== "agent" || target.region !== currentUser.region)
        return res.status(403).json({ error: "Un régional ne peut modifier que ses agents." });
    }

    if (currentUser.role === "agent") {
      return res.status(403).json({ error: "Un agent ne peut pas modifier d'autres utilisateurs." });
    }

    // ✅ Mise à jour d'un autre utilisateur (national ou regional vers agent)
    const user = await User.findByIdAndUpdate(targetUserId, updates, { new: true }).select(
      "-password"
    );

    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    res.json({ message: "Utilisateur mis à jour", user });
  } catch (err: any) {
    console.error("❌ Erreur mise à jour utilisateur:", err);
    res.status(400).json({ error: "Impossible de mettre à jour l'utilisateur", details: err.message });
  }
};

// ✅ DELETE utilisateur
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (currentUser.role === "regional") {
      if (target.role !== "agent" || target.region !== currentUser.region)
        return res.status(403).json({ error: "Un régional ne peut supprimer que ses agents." });
    }

    if (currentUser.role === "agent")
      return res.status(403).json({ error: "Un agent ne peut pas supprimer d'utilisateurs." });

    await target.deleteOne();
    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err: any) {
    res.status(400).json({ error: "Impossible de supprimer l'utilisateur", details: err.message });
  }
};

// ✅ GET permissions / rôles
export const getUserRoles = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("email role permissions");
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ✅ UPDATE permissions / rôles
export const updateUserRoles = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (currentUser.role !== "national")
      return res.status(403).json({ error: "Seul le national peut modifier les rôles." });

    const { permissions } = req.body;
    if (!permissions || typeof permissions !== "object")
      return res.status(400).json({ error: "Aucune permission valide fournie." });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true }
    ).select("email role permissions");

    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    res.json({ message: "Permissions mises à jour", user });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ✅ CHANGE PASSWORD (pour l'utilisateur connecté)
export const changePassword = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    console.log("🔐 Tentative de changement de mot de passe pour:", currentUser.email);

    // Validation
    if (!currentPassword || !newPassword) {
      console.log("❌ Validation échouée: champs manquants");
      return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe requis" });
    }

    if (newPassword.length < 6) {
      console.log("❌ Validation échouée: mot de passe trop court");
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
    }

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(currentUser.id);
    if (!user) {
      console.log("❌ Utilisateur introuvable:", currentUser.id);
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    console.log("✅ Utilisateur trouvé:", user.email);
    console.log("🔍 Mot de passe actuel existe?", !!user.password);

    // Vérifier le mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword);
    console.log("🔍 Mot de passe actuel correspond?", isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect" });
    }

    // Mettre à jour le mot de passe
    console.log("🔄 Mise à jour du mot de passe...");
    user.password = newPassword;
    await user.save();

    console.log("✅ Mot de passe modifié avec succès");
    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (err: any) {
    console.error("❌ Erreur lors du changement de mot de passe:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};