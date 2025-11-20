import { Request, Response } from "express";
import Notification from "../models/Notification";
import { io } from "../server";
import { sendSocketNotification } from "../utils/socketManager";

/* ----------------- utils normalisation téléphone (ajoutés) ---------------- */
function digits(s?: string | null) {
  return s ? s.replace(/\D+/g, "") : "";
}
function buildPhoneVariants(raw?: string | null): string[] {
  const out = new Set<string>();
  const d = digits(raw);
  if (!d) return [];

  // base
  out.add(d);

  // variantes Sénégal (221) fréquentes
  if (d.startsWith("221")) {
    const nat = d.slice(3);
    if (nat) {
      out.add(nat);
      out.add("0" + nat);
      out.add("+221" + nat);
      out.add("00221" + nat);
      out.add("221" + nat);
    }
  } else {
    out.add("221" + d);
    out.add("+221" + d);
    out.add("00221" + d);
    if (!d.startsWith("0")) out.add("0" + d);
  }
  return Array.from(out);
}

/* -------------------------------------------------------------------------- */
/* 🟢 CRÉER UNE NOUVELLE NOTIFICATION (ADMIN / NATIONAL)                      */
/* -------------------------------------------------------------------------- */
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, type, targetRoles, targetUsers, icon, status } =
      req.body;
    const user = (req as any).user;

    if (!title || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Titre et message sont requis." });
    }

    // 🧱 Création en base
    const notif = await Notification.create({
      title,
      message,
      type: type || "systeme",
      targetRoles: targetRoles?.length ? targetRoles : ["all"],
      targetUsers: targetUsers?.length ? targetUsers : [],
      icon: icon || "🔔",
      status: status || "info",
      // ⚠️ on ne touche pas à deletedBy, parentPhone, child ici (campagnes globales)
    });

    // 🚀 Diffusion temps réel aux rôles ciblés
    const payload = {
      title: notif.title,
      message: notif.message,
      type: notif.type,
      icon: notif.icon,
      status: notif.status,
      createdAt: notif.createdAt,
    };

    console.log("📡 [Socket] Notification envoyée vers:", notif.targetRoles);
    sendSocketNotification(
      io,
      (notif.targetRoles as unknown as string[]) ?? [],
      payload
    );

    res.status(201).json({
      success: true,
      message: "Notification créée et diffusée ✅",
      notification: notif,
    });
  } catch (err: any) {
    console.error("❌ Erreur createNotification:", err.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la création de la notification",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 📬 RÉCUPÉRER LES NOTIFICATIONS D’UN UTILISATEUR CONNECTÉ                   */
/* -------------------------------------------------------------------------- */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Non authentifié" });

    // ⭐ Si le parent a le rôle "user", on le fait aussi matcher les campagnes "parent"
    const rolesToMatch = Array.from(
      new Set([user.role, "all", ...(user.role === "user" ? ["parent"] : [])])
    );

    // ⭐ On tente aussi de matcher par téléphone (quel que soit le champ dans le token)
    const phoneRaw =
      user?.phone ||
      user?.phoneNumber ||
      user?.telephone ||
      user?.profile?.phone ||
      user?.profile?.phoneNumber ||
      null;

    const variants = buildPhoneVariants(phoneRaw);

    let filterOr: any[] = [];

    // 🎯 PRIORITÉ 1 : Parent mobile avec childId - FILTRAGE STRICT
    if (user.childId && user.role === "user") {
      console.log("🎯 Parent mobile détecté - Filtrage STRICT par childId:", user.childId);
      
      filterOr = [
        // Notifications spécifiques à cet enfant
        { "metadata.childId": user.childId },
        // Notifications générales pour tous les parents (campagnes, etc.)
        { 
          $and: [
            { targetRoles: { $in: ["parent", "all"] } },
            { 
              $or: [
                { "metadata.childId": { $exists: false } }, // Pas de childId spécifique
                { "metadata.childId": null }                // ou null
              ]
            }
          ]
        }
      ];
    } else {
      // 🔄 FALLBACK : Utilisateurs web (agents, admins) - logique classique
      console.log("🔄 Utilisateur web détecté - Filtrage classique pour role:", user.role);
      
      filterOr = [
        { targetRoles: { $in: rolesToMatch } },
        { targetUsers: user.id },
      ];

      // Fallback historique par numéro pour les utilisateurs web
      if (variants.length) {
        filterOr.push({ parentPhone: { $in: variants } });
      }
    }

    console.log("🔍 Requête MongoDB filterOr:", JSON.stringify(filterOr, null, 2));

    const notifications = await Notification.find({
      $and: [
        { $or: filterOr },
        // ⭐ exclure ce que l'utilisateur a masqué (soft delete)
        {
          $or: [
            { deletedBy: { $exists: false } },
            { deletedBy: { $ne: user.id } },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    console.log(`✅ ${notifications.length} notifications trouvées pour user:`, {
      id: user.id,
      role: user.role,
      childId: user.childId,
      phone: phoneRaw
    });
    
    // Log des notifications trouvées
    notifications.forEach((n, i) => {
      const metadata = (n as any).metadata;
      console.log(`  ${i+1}. ${n.title} - targetRoles: ${JSON.stringify(n.targetRoles)} - metadata.childId: ${metadata?.childId}`);
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err: any) {
    console.error("❌ Erreur getNotifications:", err.message);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des notifications",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 📩 MARQUER UNE NOTIFICATION COMME LUE                                     */
/* -------------------------------------------------------------------------- */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Non authentifié" });

    // ⭐ $addToSet pour éviter les doublons et laisser Mongoose caster l'ObjectId
    await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: user.id } },
      { new: true }
    );

    res.json({
      success: true,
      message: "Notification marquée comme lue ✅",
    });
  } catch (err: any) {
    console.error("❌ Erreur markAsRead:", err.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors du marquage",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 🗑️ SUPPRIMER UNE NOTIFICATION (hard delete par admin/national)            */
/* -------------------------------------------------------------------------- */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Notification introuvable" });

    res.json({
      success: true,
      message: "Notification supprimée 🗑️",
    });
  } catch (err: any) {
    console.error("❌ Erreur deleteNotification:", err.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧹 PURGER TOUTES LES NOTIFICATIONS (DEV SEULEMENT)                         */
/* -------------------------------------------------------------------------- */
export const purgeNotifications = async (_req: Request, res: Response) => {
  try {
    const result = await Notification.deleteMany({});
    res.json({
      success: true,
      message: "Toutes les notifications ont été supprimées 🔄",
      deleted: result.deletedCount,
    });
  } catch (err: any) {
    console.error("❌ Erreur purgeNotifications:", err.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la purge",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 👁️‍🗨️ MASQUER UNE NOTIFICATION POUR MOI (soft delete pour l'utilisateur)    */
/* -------------------------------------------------------------------------- */
export const hideForMe = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Non authentifié" });

    const notif = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { deletedBy: user.id } },
      { new: true }
    );
    if (!notif)
      return res
        .status(404)
        .json({ success: false, message: "Notification introuvable" });

    res.json({ success: true, message: "Notification masquée ✅" });
  } catch (err: any) {
    console.error("❌ Erreur hideForMe:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Erreur serveur", error: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧹 MASQUER TOUT MON HISTORIQUE (soft delete pour l'utilisateur)            */
/* -------------------------------------------------------------------------- */
export const hideAllForMe = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Non authentifié" });

    // même filtre que getNotifications
    const rolesToMatch = Array.from(
      new Set([user.role, "all", ...(user.role === "user" ? ["parent"] : [])])
    );

    // variantes téléphone
    const phoneRaw =
      user?.phone ||
      user?.phoneNumber ||
      user?.telephone ||
      user?.profile?.phone ||
      user?.profile?.phoneNumber ||
      null;
    const variants = buildPhoneVariants(phoneRaw);

    const orFilter: any[] = [
      { targetRoles: { $in: rolesToMatch } },
      { targetUsers: user.id },
    ];
    if (variants.length) {
      orFilter.push({ parentPhone: { $in: variants } });
    }

    const result = await Notification.updateMany(
      {
        $and: [
          { $or: orFilter },
          {
            $or: [
              { deletedBy: { $exists: false } },
              { deletedBy: { $ne: user.id } },
            ],
          },
        ],
      },
      { $addToSet: { deletedBy: user.id } }
    );

    res.json({
      success: true,
      message: "Historique masqué ✅",
      modified: result.modifiedCount,
    });
  } catch (err: any) {
    console.error("❌ Erreur hideAllForMe:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Erreur serveur", error: err.message });
  }
};
/* -------------------------------------------------------------------------- */
/* 🕒 RÉCUPÉRER LES NOTIFICATIONS RÉCENTES (pour le dashboard)               */
/* -------------------------------------------------------------------------- */
export const getRecentNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Non authentifié" });

    const since = new Date();
    since.setHours(since.getHours() - 24); // dernières 24h

    const notifications = await Notification.find({
      createdAt: { $gte: since },
      $or: [
        { targetRoles: { $in: [user.role, "all"] } },
        { targetUsers: user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err: any) {
    console.error("❌ Erreur getRecentNotifications:", err.message);
    res.status(500).json({
      success: false,
      message:
        "Erreur serveur lors de la récupération des notifications récentes",
      error: err.message,
    });
  }
};
