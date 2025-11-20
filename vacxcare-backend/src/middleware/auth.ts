import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User";

/* -------------------------------------------------------------------------- */
/* 🧩 Définition du type utilisateur authentifié                              */
/* -------------------------------------------------------------------------- */
export interface AuthUser {
  _id: mongoose.Types.ObjectId | string; // ✅ utilisé dans les contrôleurs
  id: string; // ✅ alias pratique
  role: "agent" | "regional" | "national" | "user";
  email: string;
  region?: string;
  healthCenter?: string;
  phone?: string;
  phoneNumber?: string;
  childId?: string;
}

/* -------------------------------------------------------------------------- */
/* 🔐 Middleware d’authentification JWT                                       */
/* -------------------------------------------------------------------------- */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"];
    const cookieToken = (req as any).cookies?.token as string | undefined;

    let token: string | undefined;

    // 🔎 Extraction du token depuis le header ou les cookies
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return res.status(401).json({ error: "Token manquant" });
    }

    // 🧾 Décodage du JWT avec validation stricte
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET manquant dans les variables d'environnement");
      return res.status(500).json({ error: "Configuration serveur invalide" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as {
      id: string;
      childId?: string;
      role: "agent" | "regional" | "national" | "user";
      email?: string;
      region?: string;
      healthCenter?: string;
      type?: string;
      phone?: string;
      phoneNumber?: string;
    };

    // 🔹 Cas spécial : Parent mobile (authentifié via child + phone)
    if (decoded.type === "parent" || decoded.role === "user") {
      console.log("✅ Parent mobile authentifié:", decoded.phone || decoded.phoneNumber);
      req.user = {
        _id: decoded.id,
        id: decoded.id,
        role: "user" as any, // Role "user" pour les parents
        email: decoded.email || `parent_${decoded.phone || decoded.phoneNumber}`,
        phone: decoded.phone || decoded.phoneNumber,
        phoneNumber: decoded.phone || decoded.phoneNumber,
        childId: decoded.childId,
      } as any;
      return next();
    }

    // 🔍 Vérification dans la base (pour agents/régionaux/nationaux)
    const dbUser = await User.findById(decoded.id).select(
      "role email region healthCenter active"
    );

    if (!dbUser) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    if (dbUser.active === false) {
      return res.status(403).json({ error: "Compte désactivé" });
    }

    // ✅ Injection dans la requête (req.user)
    req.user = {
      _id: dbUser._id,
      id: dbUser._id.toString(),
      role: dbUser.role,
      email: dbUser.email,
      region: dbUser.region,
      healthCenter: dbUser.healthCenter,
    } as AuthUser;

    next();
  } catch (err: any) {
    console.error("❌ Erreur authMiddleware:", err);
    return res.status(403).json({ error: "Token invalide ou expiré" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🛑 Middleware de restriction par rôle                                      */
/* -------------------------------------------------------------------------- */
export const roleCheck =
  (...allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `Accès interdit : rôle '${user.role}' non autorisé.`,
      });
    }

    next();
  };
