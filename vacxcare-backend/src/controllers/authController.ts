import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { IUser, UserRole } from "../models/User";
import SystemSettings from "../models/SystemSettings";
import HealthCenter from "../models/HealthCenter";
import { sendTwoFactorCode, sendPasswordResetEmail } from "../utils/mailer";
import { sendSMS } from "../services/sms";

const JWT_SECRET = process.env.JWT_SECRET || "monSuperSecret";

/* -------------------------------------------------------------------------- */
/* 🧩 REGISTER                                                                */
/* -------------------------------------------------------------------------- */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role, region, healthCenter } = req.body as {
      email: string;
      password: string;
      role?: UserRole;
      region?: string;
      healthCenter?: string;
    };

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Cet utilisateur existe déjà" });
    }

    const allowedRoles: UserRole[] = ["national", "regional", "agent", "user"];
    const roleToAssign: UserRole = allowedRoles.includes(role || "user")
      ? (role as UserRole)
      : "user";

    const created = await User.create({
      email,
      // ⚠️ Laisser le hook Mongoose hasher
      password,
      role: roleToAssign,
      region:
        roleToAssign === "regional" || roleToAssign === "agent"
          ? region
          : undefined,
      healthCenter: roleToAssign === "agent" ? healthCenter : undefined,
    });

    const token = jwt.sign(
      {
        id: created._id.toString(),
        email: created.email,
        role: created.role,
        region: created.region,
        healthCenter: created.healthCenter,
        agentLevel: (created as any).agentLevel,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(201).json({
      success: true,
      message: "Utilisateur créé",
      token,
      user: {
        id: created._id.toString(),
        email: created.email,
        role: created.role,
        region: created.region,
        healthCenter: created.healthCenter,
        agentLevel: (created as any).agentLevel,
      },
    });
  } catch (err: any) {
    console.error("register error", err);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: err?.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔐 2FA: SEND (email only)                                                  */
/* -------------------------------------------------------------------------- */
export const sendTwoFactor = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const settings = await SystemSettings.findOne();
    const require2FA = settings?.twoFactorEnabled && (user.role === "agent" || user.role === "district" || user.role === "regional");
    if (!require2FA) return res.status(400).json({ message: "2FA non requis" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactorCode = code;
    user.twoFactorExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.twoFactorMethod = "email";
    await user.save();

    await sendTwoFactorCode(user.email, code);

    return res.json({ success: true, message: "Code envoyé", method: "email" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔐 2FA: VERIFY                                                             */
/* -------------------------------------------------------------------------- */
export const verifyTwoFactor = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string; code: string };
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    if (!user.twoFactorCode || !user.twoFactorExpires || user.twoFactorExpires < new Date()) {
      return res.status(400).json({ message: "Code expiré ou non demandé" });
    }
    if (user.twoFactorCode !== code) {
      return res.status(400).json({ message: "Code incorrect" });
    }

    // Clear code and issue token
    user.twoFactorCode = null;
    user.twoFactorExpires = null;

    // 🧭 Résolution rétrocompatible du niveau d'agent pour les anciens comptes
    // Migration automatique : agentLevel:"district" → role:"district"
    if (user.role === "agent" && user.healthCenter) {
      try {
        const center = await HealthCenter.findOne({ name: user.healthCenter });
        if (center) {
          const centerAny: any = center;
          if (centerAny.type === "district") {
            // ✅ Migration auto: District devient un rôle indépendant
            user.role = "district";
            user.agentLevel = undefined;
          } else if (!user.agentLevel) {
            // Agent simple sans agentLevel défini
            user.agentLevel = "facility_admin";
          }
        }
      } catch {}
    }

    await user.save();

    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      region: user.region,
      healthCenter: user.healthCenter,
      agentLevel: (user as any).agentLevel,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "2FA validée", token, user: payload });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔐 LOGIN                                                                  */
/* -------------------------------------------------------------------------- */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = (await User.findOne({ email })) as IUser | null;

    if (!user || !user.password) {
      return res
        .status(401)
        .json({ success: false, message: "Identifiants invalides" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Identifiants invalides" });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé. Contactez l’administrateur.",
      });
    }

    // 🧭 Résolution rétrocompatible du niveau d'agent pour les anciens comptes  
    // Migration automatique : agentLevel:"district" → role:"district"
    if (user.role === "agent" && user.healthCenter) {
      try {
        const center = await HealthCenter.findOne({ name: user.healthCenter });
        if (center) {
          const centerAny: any = center;
          if (centerAny.type === "district") {
            // ✅ Migration auto: District devient un rôle indépendant
            user.role = "district";
            user.agentLevel = undefined;
            await (user as any).save();
          } else if (!user.agentLevel) {
            // Agent simple sans agentLevel défini
            user.agentLevel = "facility_admin";
            await (user as any).save();
          }
        }
      } catch {}
    }

    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      region: user.region,
      healthCenter: user.healthCenter,
      agentLevel: (user as any).agentLevel,
    };

    // 🔐 2FA enforcement for agent/district/regional if enabled in system settings
    const settings = await SystemSettings.findOne();
    const require2FA = settings?.twoFactorEnabled && (user.role === "agent" || user.role === "district" || user.role === "regional");
    if (require2FA) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000);
      user.twoFactorEnabled = true;
      // Force email only per requirement
      const method: "email" = "email";
      user.twoFactorMethod = method;
      user.twoFactorCode = code;
      user.twoFactorExpires = expires;
      await (user as any).save();

      // Envoi réel via mail/SMS (mock SMS si MOCK_SMS=true)
      await sendTwoFactorCode(user.email, code);

      return res.json({
        success: true,
        twoFactorRequired: true,
        method,
        message: "Code de vérification envoyé",
      });
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Connexion réussie",
      token,
      user: payload,
    });
  } catch (err: any) {
    console.error("login error", err);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: err?.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧭 ME : récupérer le profil connecté                                       */
/* -------------------------------------------------------------------------- */
export const me = async (req: Request, res: Response) => {
  try {
    const authHeader = (req.headers.authorization as string) || "";
    let token: string | undefined =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : undefined;

    if (!token && (req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }
    if (!token) return res.status(401).json({ error: "Token manquant" });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(payload.id)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!user)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    return res.json(user);
  } catch (err: any) {
    console.error("me error", err);
    return res
      .status(500)
      .json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔑 SET PASSWORD : définir un mot de passe après invitation                 */
/* -------------------------------------------------------------------------- */
export const setPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token et mot de passe requis" });
    }

    // 1) Invitation flow: token saved on user document
    const now = new Date();
    let user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: now },
    });

    // 2) Fallback: support JWT-based tokens as well (older flow)
    if (!user) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(payload.id) || undefined as any;
      } catch {}
    }

    if (!user) {
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    // ⚠️ Laisser le hook Mongoose hasher
    user.password = password;
    // Clear invitation token fields and activate account
    (user as any).resetPasswordToken = undefined;
    (user as any).resetPasswordExpires = undefined;
    if ((user as any).active === false) (user as any).active = true;
    await user.save();

    return res.json({
      success: true,
      message: "Mot de passe défini avec succès",
    });
  } catch (err: any) {
    console.error("setPassword error:", err);
    return res.status(400).json({ message: "Token invalide ou expiré" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔄 FORGOT PASSWORD : envoi d’un email de réinitialisation (simulé ici)     */
/* -------------------------------------------------------------------------- */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(email, resetLink);
    } catch (err: any) {
      console.error("❌ Erreur envoi email reset:", err?.message);
    }

    return res.json({
      success: true,
      message: "Email de réinitialisation envoyé",
    });
  } catch (err: any) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔁 RESET PASSWORD : définir un nouveau mot de passe via token              */
/* -------------------------------------------------------------------------- */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ message: "Token et mot de passe requis" });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(payload.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    // ⚠️ Laisser le hook Mongoose hasher
    user.password = password;
    await user.save();

    return res.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (err: any) {
    console.error("resetPassword error:", err);
    return res.status(400).json({ message: "Token invalide ou expiré" });
  }
};
