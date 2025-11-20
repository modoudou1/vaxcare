import { Router } from "express";
import {
  forgotPassword,
  login,
  me,
  register,
  resetPassword,
  setPassword,
  sendTwoFactor,
  verifyTwoFactor,
} from "../controllers/authController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification des utilisateurs (register, login, reset, etc.)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthRegister:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: parent@test.com
 *         password:
 *           type: string
 *           example: Parent123!
 *         role:
 *           type: string
 *           enum: [user, agent, regional, national]
 *           example: regional
 *         region:
 *           type: string
 *           example: Dakar
 *         healthCenter:
 *           type: string
 *           example: Centre Médical Plateau
 *     AuthLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: admin@vacxcare.com
 *         password:
 *           type: string
 *           example: Admin123!
 *     AuthSetPassword:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *           description: Jeton reçu par email
 *         password:
 *           type: string
 *           example: NewPassword123!
 *     AuthForgotPassword:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           example: user@test.com
 *     AuthResetPassword:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *         password:
 *           type: string
 *           example: ResetPassword123!
 */

// --- REGISTER ---
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscrire un utilisateur (parent, agent, régional, national)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegister'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Email ou mot de passe manquant
 *       409:
 *         description: Cet utilisateur existe déjà
 */
router.post("/register", register);

// --- LOGIN ---
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur (tous rôles)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants invalides
 */
router.post("/login", login);

// --- 2FA ---
router.post("/2fa/send", sendTwoFactor);
router.post("/2fa/verify", verifyTwoFactor);

// --- SET PASSWORD ---
/**
 * @swagger
 * /api/auth/set-password:
 *   post:
 *     summary: Définir un mot de passe après une invitation
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthSetPassword'
 *     responses:
 *       200:
 *         description: Mot de passe défini avec succès
 *       400:
 *         description: Token invalide ou expiré
 */
router.post("/set-password", setPassword);

// --- FORGOT PASSWORD ---
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demander une réinitialisation de mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthForgotPassword'
 *     responses:
 *       200:
 *         description: Email envoyé
 *       404:
 *         description: Utilisateur introuvable
 */
router.post("/forgot-password", forgotPassword);

// --- RESET PASSWORD ---
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialiser un mot de passe avec un token reçu par email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthResetPassword'
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Token invalide ou expiré
 */
router.post("/reset-password", resetPassword);

// --- PING ---
/**
 * @swagger
 * /api/auth/ping:
 *   get:
 *     summary: Vérifie si le serveur répond
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: pong 🏓
 */
router.get("/ping", (req, res) => {
  res.json({ message: "pong 🏓", date: new Date() });
});

// --- ME (profil courant) ---
/**
 * GET /api/auth/me
 * Retourne le profil de l'utilisateur courant (token Bearer ou cookie token)
 */
router.get("/me", me);

export default router;
