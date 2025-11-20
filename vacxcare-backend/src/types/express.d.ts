export {};

import { AuthUser } from "../middleware/auth";

declare global {
  namespace Express {
    /**
     * ✅ Le type `user` reconnu dans toutes les requêtes authentifiées
     *    Injecté par le middleware authMiddleware
     */
    interface Request {
      user?: AuthUser;
    }
  }
}
