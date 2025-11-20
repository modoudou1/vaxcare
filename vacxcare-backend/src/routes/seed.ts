import express, { Request, Response } from "express";
import { authMiddleware, roleCheck } from "../middleware/auth";
import { seedSenegalData, seedAgentDemo, seedRegionalAccounts } from "../controllers/seedController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Seed
 *   description: Initialisation de données (démo)
 */

/**
 * @swagger
 * /api/seed/senegal:
 *   post:
 *     summary: Génère des régions, centres, vaccins, enfants et vaccinations (données de démo Sénégal)
 *     tags: [Seed]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Seed exécuté }
 */
router.post(
  "/senegal",
  (authMiddleware as unknown) as express.RequestHandler,
  (roleCheck("national") as unknown) as express.RequestHandler,
  (req: Request, res: Response) => seedSenegalData(req, res)
);

/**
 * @swagger
 * /api/seed/agent-demo:
 *   post:
 *     summary: Crée des enfants et vaccinations de démo pour l'agent connecté
 *     tags: [Seed]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Seed agent exécuté }
 */
router.post(
  "/agent-demo",
  (authMiddleware as unknown) as express.RequestHandler,
  (roleCheck("agent") as unknown) as express.RequestHandler,
  (req: Request, res: Response) => seedAgentDemo(req, res)
);

/**
 * @swagger
 * /api/seed/regionals:
 *   post:
 *     summary: Crée un compte régional unique pour chaque région avec email distinct et mot de passe par défaut
 *     tags: [Seed]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Comptes régionaux générés }
 */
router.post(
  "/regionals",
  (authMiddleware as unknown) as express.RequestHandler,
  (roleCheck("national") as unknown) as express.RequestHandler,
  (req: Request, res: Response) => seedRegionalAccounts(req, res)
);

export default router;
