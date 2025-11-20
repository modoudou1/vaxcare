import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";

// ✅ Vérifie que l’utilisateur a un rôle autorisé
export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Accès interdit : rôle insuffisant" });
    }
    next();
  };
};
