import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

/* -------------------------------------------------------------------------- */
/* 🛡️ Rate Limiter Global - Protection générale                              */
/* -------------------------------------------------------------------------- */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limite de 1000 requêtes par IP par fenêtre
  message: {
    error: "Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.",
    retryAfter: 15 * 60,
  },
  standardHeaders: true, // Retourne les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Rate limit dépassé pour IP: ${req.ip} - Route: ${req.path}`);
    res.status(429).json({
      error: "Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.",
      retryAfter: 15 * 60,
    });
  },
});

/* -------------------------------------------------------------------------- */
/* 🔐 Rate Limiter Authentification - Protection login/register               */
/* -------------------------------------------------------------------------- */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite de 10 tentatives de connexion par IP par fenêtre
  message: {
    error: "Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.",
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compte que les échecs
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Tentatives de connexion excessives pour IP: ${req.ip}`);
    res.status(429).json({
      error: "Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.",
      retryAfter: 15 * 60,
    });
  },
});

/* -------------------------------------------------------------------------- */
/* 📱 Rate Limiter Mobile - Protection API mobile                            */
/* -------------------------------------------------------------------------- */
export const mobileLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Limite de 200 requêtes par IP par fenêtre (plus permissif pour mobile)
  message: {
    error: "Trop de requêtes depuis cette application, veuillez réessayer dans 5 minutes.",
    retryAfter: 5 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Rate limit mobile dépassé pour IP: ${req.ip} - Route: ${req.path}`);
    res.status(429).json({
      error: "Trop de requêtes depuis cette application, veuillez réessayer dans 5 minutes.",
      retryAfter: 5 * 60,
    });
  },
});

/* -------------------------------------------------------------------------- */
/* 📧 Rate Limiter Email - Protection envoi emails/SMS                       */
/* -------------------------------------------------------------------------- */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // Limite de 50 emails/SMS par IP par heure
  message: {
    error: "Trop d'envois d'emails/SMS, veuillez réessayer dans 1 heure.",
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Rate limit email dépassé pour IP: ${req.ip} - Route: ${req.path}`);
    res.status(429).json({
      error: "Trop d'envois d'emails/SMS, veuillez réessayer dans 1 heure.",
      retryAfter: 60 * 60,
    });
  },
});

/* -------------------------------------------------------------------------- */
/* 🔄 Rate Limiter API Critique - Protection endpoints sensibles             */
/* -------------------------------------------------------------------------- */
export const criticalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // Limite de 10 requêtes par IP par heure pour les actions critiques
  message: {
    error: "Trop d'actions critiques, veuillez réessayer dans 1 heure.",
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Rate limit critique dépassé pour IP: ${req.ip} - Route: ${req.path}`);
    res.status(429).json({
      error: "Trop d'actions critiques, veuillez réessayer dans 1 heure.",
      retryAfter: 60 * 60,
    });
  },
});

/* -------------------------------------------------------------------------- */
/* 📦 Export groupé des rate limiters                                        */
/* -------------------------------------------------------------------------- */
export const rateLimiters = {
  global: globalLimiter,
  auth: authLimiter,
  mobile: mobileLimiter,
  email: emailLimiter,
  critical: criticalLimiter
};
