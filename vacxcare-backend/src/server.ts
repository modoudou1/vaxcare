import dotenv from "dotenv";
dotenv.config(); // Charger .env avant tout

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import connectDB from "./config/db";
import { setupSwagger } from "./config/swagger";
import { validateEnvironment } from "./config/environment";

// Imports des améliorations
import { registerSocketEvents } from "./utils/socketManager";
import { logger } from "./utils/logger";
import { globalErrorHandler, notFoundHandler, setupGlobalErrorHandlers } from "./utils/errorHandler";
import { monitoringMiddleware, initializeMonitoring, healthCheckRoute, metricsRoute, readinessRoute, livenessRoute } from "./utils/monitoring";
import { rateLimiters } from "./middleware/rateLimiter";

/* -------------------------------------------------------------------------- */
/* ⚙️ IMPORT DES ROUTES                                                     */
/* -------------------------------------------------------------------------- */
import agentRoutes from "./routes/agent";
import agentMetricsRoutes from "./routes/agentMetrics";
import appointmentRoutes from "./routes/appointment";
import appointmentRequestRoutes from "./routes/appointmentRequest";
import authRoutes from "./routes/auth";

import campaignRoutes from "./routes/campaign";
import childRoutes from "./routes/child";
import dashboardRoutes from "./routes/dashboard";
import dataRoutes from "./routes/data";
import healthAdviceRoutes from "./routes/healthAdvice";
import healthCenterRoutes from "./routes/healthCenter";
import healthTipRoutes from "./routes/healthTip";
import linkChildRoutes from "./routes/linkChild"; // Route linkChild
import mobileRoutes from "./routes/mobile";
import notificationRoutes from "./routes/notification";
import parentRoutes from "./routes/parent";
import privacyRoutes from "./routes/privacy";
import regionRoutes from "./routes/region";
import reportRoutes from "./routes/report";
import reportPdfRoutes from "./routes/reportPdf";
import statsRoutes from "./routes/stats";
import stockRoutes from "./routes/stock";
import systemSettingsRoutes from "./routes/systemSettings";
import testRoutes from "./routes/test";
import userRoutes from "./routes/user";
import vaccinationRoutes from "./routes/vaccination";
import vaccineRoutes from "./routes/vaccine";
import vaccineCalendarRoutes from "./routes/vaccineCalendar";
import vaccineScheduleRoutes from "./routes/vaccineSchedule";
import vaccineSchedulePdfRoutes from "./routes/vaccineSchedulePdfRoutes";
import vaccinationDaysRoutes from "./routes/vaccinationDays";

/* -------------------------------------------------------------------------- */
/* ⚙️ IMPORT DU CRON AUTOMATIQUE STOCKS                                      */
/* -------------------------------------------------------------------------- */
import { startStockAlertsCron } from "./cron/stockAlertsCron";

/* -------------------------------------------------------------------------- */
/* ⚙️ IMPORTS UTILITAIRES SUPPLÉMENTAIRES                                    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* ⚙️ EXPRESS APP CONFIGURATION                                              */
/* -------------------------------------------------------------------------- */
// Valider l'environnement au démarrage
validateEnvironment();

// Configurer les gestionnaires d'erreurs globaux
setupGlobalErrorHandlers();

const app = express();

/* -------------------------------------------------------------------------- */
/* 🛡️ MIDDLEWARES DE SÉCURITÉ ET PERFORMANCE                                */
/* -------------------------------------------------------------------------- */
// Sécurité avec Helmet
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Pour Socket.io
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permettre le cross-origin pour les ressources
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://localhost:*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*", "http://localhost:*", "https://localhost:*"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "http://localhost:*", "https://localhost:*"],
      frameSrc: ["'self'"]
    }
  }
}));

// Compression des réponses
app.use(compression());

// Logging des requêtes
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim(), { type: 'http' })
  }
}));

// Monitoring des performances
app.use(monitoringMiddleware);

// Rate limiting global
app.use(rateLimiters.global);

/* -------------------------------------------------------------------------- */
/* ✅ MIDDLEWARE CORS — compatible Flutter Web & mobile                      */
/* -------------------------------------------------------------------------- */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // ex: apps natives (Flutter, mobile)

      const allowed =
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);

      if (allowed) {
        console.log("✅ [CORS autorisé] →", origin);
        return callback(null, true);
      }

      console.warn("❌ [CORS BLOQUÉ] →", origin);
      return callback(new Error("Origine non autorisée"));
    },
    credentials: true,
    // ✅ Ajout de PATCH ici pour autoriser la mise à jour
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* -------------------------------------------------------------------------- */
/* ✅ MIDDLEWARES GÉNÉRAUX                                                   */
/* -------------------------------------------------------------------------- */
app.use(express.json());
app.use(cookieParser());
// Middleware pour les fichiers statiques avec headers CORS spécifiques
app.use("/uploads", (req, res, next) => {
  // Headers CORS permissifs pour les fichiers statiques
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, "..", "uploads")));

/* -------------------------------------------------------------------------- */
/* ✅ CONNEXION DB + SEED                                                    */
/* -------------------------------------------------------------------------- */
connectDB()
  .then(async () => {
    console.log("✅ Base de données connectée");

    console.log("📅 Calendrier initialisé");
  })
  .catch((err) => console.error("❌ Erreur connexion MongoDB :", err));

/* -------------------------------------------------------------------------- */
/* ✅ SWAGGER                                                                */
/* -------------------------------------------------------------------------- */
setupSwagger(app);

/* -------------------------------------------------------------------------- */
/* 🏥 ROUTES DE MONITORING ET SANTÉ                                          */
/* -------------------------------------------------------------------------- */
app.get("/health", healthCheckRoute);
app.get("/metrics", metricsRoute);
app.get("/ready", readinessRoute);
app.get("/alive", livenessRoute);

/* -------------------------------------------------------------------------- */
/* ✅ ROUTES PRINCIPALES                                                     */
/* -------------------------------------------------------------------------- */
app.use("/api/auth", rateLimiters.auth, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/children", linkChildRoutes); // Lier un enfant existant - DOIT ÊTRE AVANT childRoutes
app.use("/api/children", childRoutes);
app.use("/api/parents", parentRoutes); // Routes parents
app.use("/api/vaccinations", vaccinationRoutes);
app.use("/api/vaccine", vaccineRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/health-advices", healthAdviceRoutes);
app.use("/api/health-tips", healthTipRoutes);
app.use("/api/healthcenters", healthCenterRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/appointment-requests", appointmentRequestRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/vaccine-schedule", vaccineScheduleRoutes);

app.use("/api/mobile", rateLimiters.mobile, mobileRoutes);
app.use("/api/mobile", privacyRoutes); // Routes privacy (export données, suppression compte)
app.use("/api/test", testRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/agent-metrics", agentMetricsRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/reportpdf", reportPdfRoutes);
app.use("/api/vaccine-schedule-pdf", vaccineSchedulePdfRoutes);
app.use("/api/system-settings", systemSettingsRoutes);
app.use("/api/stocks", stockRoutes);
// Ajouter la route pour vaccineCalendar
app.use("/api/vaccine-calendar", vaccineCalendarRoutes);
// Ajouter la route pour les jours de vaccination
app.use("/api/vaccination-days", vaccinationDaysRoutes);

/* -------------------------------------------------------------------------- */
/* 🚨 GESTIONNAIRES D'ERREURS (À LA FIN)                                    */
/* -------------------------------------------------------------------------- */
// Route non trouvée
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(globalErrorHandler);

/* -------------------------------------------------------------------------- */
/* 🌐 SERVEUR HTTP + SOCKET.IO                                              */
/* -------------------------------------------------------------------------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
  pingInterval: 25000,
  pingTimeout: 120000,
});

// ✅ Gestion des sockets
registerSocketEvents(io);
app.locals.io = io;

// Middleware pour rendre io accessible dans les requêtes
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

io.on("connection", (socket) => {
  console.log(`✅ Client connecté : ${socket.id}`);
  socket.on("disconnect", (reason) => {
    console.log(`🔴 Client ${socket.id} déconnecté — raison : ${reason}`);
  });
  socket.on("error", (err) => console.error("⚠️ Erreur Socket.io :", err));
});

// 🔔 Test socket automatique
setTimeout(() => {
  io.to("parent").emit("newNotification", {
    type: "campagne",
    title: "🔔 Test Socket.io réussi !",
    message: "Connexion active et notifications fonctionnelles ✅",
    icon: "🔔",
  });
  console.log("📡 Test Socket.io envoyé à tous les parents !");
}, 5000);

/* -------------------------------------------------------------------------- */
/* ⏰ CRON STOCKS                                                            */
/* -------------------------------------------------------------------------- */
startStockAlertsCron();

/* -------------------------------------------------------------------------- */
/* 🚀 LANCEMENT SERVEUR                                                     */
/* -------------------------------------------------------------------------- */
const PORT = process.env.PORT || 5000; // Port 5000 par défaut
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📖 Swagger disponible sur http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Métriques: http://localhost:${PORT}/metrics`);
  console.log("⏰ CRON des alertes de stock activé !");
  
  // Initialiser le monitoring
  initializeMonitoring();
  
  logger.info('Serveur VaxCare démarré avec succès', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    features: ['security', 'monitoring', 'caching', 'validation', 'logging']
  });
});

/* -------------------------------------------------------------------------- */
/* ✅ EXPORTS                                                                */
/* -------------------------------------------------------------------------- */
export { io };
export default app;
