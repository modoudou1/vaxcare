import { Request, Response } from "express";
import SystemSettings from "../models/SystemSettings";
import AuditLog from "../models/AuditLog";
import ApiKey from "../models/ApiKey";
import crypto from "crypto";

// ⚡ Récupérer les paramètres système
export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettings.findOne();
    if (!settings) {
      const defaultSettings = await SystemSettings.create({
        appName: "VacXCare",
        language: "fr",
        timezone: "Africa/Dakar",
        notificationsEnabled: true,
        emailNotifications: true,
        smsNotifications: false,
        maintenanceMode: false,
        backupEnabled: true,
        backupFrequency: "daily",
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        requireSpecialChar: true,
        twoFactorEnabled: false,
        notificationChannels: {
          alerts: ["inapp"],
          auth: ["email"],
          onboarding_parent: ["sms"],
        },
      });
      
      // Si pas d'utilisateur authentifié, retourner seulement les données publiques (incluant mobile)
      if (!(req as any).user) {
        const publicSettings = {
          appName: defaultSettings.appName,
          appSubtitle: defaultSettings.appSubtitle,
          logoUrl: defaultSettings.logoUrl,
          primaryColor: defaultSettings.primaryColor,
          headerColor: defaultSettings.headerColor,
          headerTextColor: defaultSettings.headerTextColor,
          headerIconColor: defaultSettings.headerIconColor,
          sidebarBgColor: defaultSettings.sidebarBgColor,
          sidebarTextColor: defaultSettings.sidebarTextColor,
          accentColor: defaultSettings.accentColor,
          language: defaultSettings.language,
          // 📱 Paramètres mobile
          mobileBackgroundColor: defaultSettings.mobileBackgroundColor,
          mobileButtonColor: defaultSettings.mobileButtonColor,
          onboardingSlide1Image: defaultSettings.onboardingSlide1Image,
          onboardingSlide1Title: defaultSettings.onboardingSlide1Title,
          onboardingSlide1Subtitle: defaultSettings.onboardingSlide1Subtitle,
          onboardingSlide2Image: defaultSettings.onboardingSlide2Image,
          onboardingSlide2Title: defaultSettings.onboardingSlide2Title,
          onboardingSlide2Subtitle: defaultSettings.onboardingSlide2Subtitle,
          onboardingSlide3Image: defaultSettings.onboardingSlide3Image,
          onboardingSlide3Title: defaultSettings.onboardingSlide3Title,
          onboardingSlide3Subtitle: defaultSettings.onboardingSlide3Subtitle,
          dashboardSlide1Image: defaultSettings.dashboardSlide1Image,
          dashboardSlide1Title: defaultSettings.dashboardSlide1Title,
          dashboardSlide1Subtitle: defaultSettings.dashboardSlide1Subtitle,
          dashboardSlide2Image: defaultSettings.dashboardSlide2Image,
          dashboardSlide2Title: defaultSettings.dashboardSlide2Title,
          dashboardSlide2Subtitle: defaultSettings.dashboardSlide2Subtitle,
          dashboardSlide3Image: defaultSettings.dashboardSlide3Image,
          dashboardSlide3Title: defaultSettings.dashboardSlide3Title,
          dashboardSlide3Subtitle: defaultSettings.dashboardSlide3Subtitle,
        };
        return res.json(publicSettings);
      }
      
      return res.json(defaultSettings);
    }
    
    // Garantir des valeurs par défaut si anciennes données
    const s = settings.toObject();
    if (!s.notificationChannels) {
      s.notificationChannels = {
        alerts: ["inapp"],
        auth: ["email"],
        onboarding_parent: ["sms"],
      };
    }
    
    // Si pas d'utilisateur authentifié, retourner seulement les données publiques (incluant mobile)
    if (!(req as any).user) {
      const publicSettings = {
        appName: s.appName,
        appSubtitle: s.appSubtitle,
        logoUrl: s.logoUrl,
        primaryColor: s.primaryColor,
        headerColor: s.headerColor,
        headerTextColor: s.headerTextColor,
        headerIconColor: s.headerIconColor,
        sidebarBgColor: s.sidebarBgColor,
        sidebarTextColor: s.sidebarTextColor,
        accentColor: s.accentColor,
        language: s.language,
        // 📱 Paramètres mobile
        mobileBackgroundColor: s.mobileBackgroundColor,
        mobileButtonColor: s.mobileButtonColor,
        onboardingSlide1Image: s.onboardingSlide1Image,
        onboardingSlide1Title: s.onboardingSlide1Title,
        onboardingSlide1Subtitle: s.onboardingSlide1Subtitle,
        onboardingSlide2Image: s.onboardingSlide2Image,
        onboardingSlide2Title: s.onboardingSlide2Title,
        onboardingSlide2Subtitle: s.onboardingSlide2Subtitle,
        onboardingSlide3Image: s.onboardingSlide3Image,
        onboardingSlide3Title: s.onboardingSlide3Title,
        onboardingSlide3Subtitle: s.onboardingSlide3Subtitle,
        dashboardSlide1Image: s.dashboardSlide1Image,
        dashboardSlide1Title: s.dashboardSlide1Title,
        dashboardSlide1Subtitle: s.dashboardSlide1Subtitle,
        dashboardSlide2Image: s.dashboardSlide2Image,
        dashboardSlide2Title: s.dashboardSlide2Title,
        dashboardSlide2Subtitle: s.dashboardSlide2Subtitle,
        dashboardSlide3Image: s.dashboardSlide3Image,
        dashboardSlide3Title: s.dashboardSlide3Title,
        dashboardSlide3Subtitle: s.dashboardSlide3Subtitle,
      };
      return res.json(publicSettings);
    }
    
    res.json(s);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ⚡ Mettre à jour les paramètres système
export const updateSystemSettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const user = (req as any).user;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      updates,
      { new: true, upsert: true }
    );

    // Log audit
    await AuditLog.create({
      userId: user?.id,
      action: "UPDATE_SYSTEM_SETTINGS",
      details: { updates },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({ message: "Paramètres mis à jour", settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ⚡ Upload du logo (PNG/PDF) et mise à jour de logoUrl
export const uploadSystemLogo = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }

    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const publicUrl = `${baseUrl}/uploads/${file.filename}`;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { logoUrl: publicUrl },
      { new: true, upsert: true }
    );

    return res.json({ message: "Logo uploadé", url: publicUrl, settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// 📊 Récupérer les logs d'audit
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const query: any = {};
    
    if (action) query.action = action;
    if (userId) query.userId = userId;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate("userId", "email firstName lastName");

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 🔑 Générer une clé API
export const generateApiKey = async (req: Request, res: Response) => {
  try {
    const { name, permissions, expiresIn } = req.body;
    const user = (req as any).user;

    const key = crypto.randomBytes(32).toString("hex");
    const hashedKey = crypto.createHash("sha256").update(key).digest("hex");

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : undefined;

    const apiKey = await ApiKey.create({
      name,
      key: hashedKey,
      permissions: permissions || [],
      createdBy: user?.id,
      expiresAt,
    });

    await AuditLog.create({
      userId: user?.id,
      action: "CREATE_API_KEY",
      details: { keyId: apiKey._id, name },
      ipAddress: req.ip,
    });

    res.json({
      message: "Clé API créée",
      apiKey: { ...apiKey.toObject(), plainKey: key },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 🔑 Lister les clés API
export const getApiKeys = async (_req: Request, res: Response) => {
  try {
    const keys = await ApiKey.find({ active: true })
      .select("-key")
      .populate("createdBy", "email");
    res.json({ keys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 🔑 Révoquer une clé API
export const revokeApiKey = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await ApiKey.findByIdAndUpdate(id, { active: false });

    await AuditLog.create({
      userId: user?.id,
      action: "REVOKE_API_KEY",
      details: { keyId: id },
      ipAddress: req.ip,
    });

    res.json({ message: "Clé API révoquée" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 💾 Créer une sauvegarde
export const createBackup = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Logique de backup à implémenter selon votre infrastructure
    const backupId = `backup_${Date.now()}`;

    await AuditLog.create({
      userId: user?.id,
      action: "CREATE_BACKUP",
      details: { backupId },
      ipAddress: req.ip,
    });

    res.json({ message: "Sauvegarde créée", backupId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 🔧 Activer/désactiver le mode maintenance
export const toggleMaintenanceMode = async (req: Request, res: Response) => {
  try {
    const { enabled, message } = req.body;
    const user = (req as any).user;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { maintenanceMode: enabled, maintenanceMessage: message },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: user?.id,
      action: "TOGGLE_MAINTENANCE_MODE",
      details: { enabled, message },
      ipAddress: req.ip,
    });

    res.json({ message: "Mode maintenance mis à jour", settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 📈 Statistiques système
export const getSystemStats = async (_req: Request, res: Response) => {
  try {
    const logsCount = await AuditLog.countDocuments();
    const apiKeysCount = await ApiKey.countDocuments({ active: true });
    const recentLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "email");

    res.json({
      stats: {
        totalLogs: logsCount,
        activeApiKeys: apiKeysCount,
        recentActivity: recentLogs,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 🔔 Mettre à jour les paramètres de notification
export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const { emailNotifications, smsNotifications, pushNotifications, notificationEmail, notificationPhone, notificationChannels } = req.body;
    const user = (req as any).user;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      {
        emailNotifications,
        smsNotifications,
        pushNotifications,
        notificationEmail,
        notificationPhone,
        ...(notificationChannels && {
          notificationChannels: {
            alerts: Array.isArray(notificationChannels.alerts) ? notificationChannels.alerts : ["inapp"],
            auth: Array.isArray(notificationChannels.auth) ? notificationChannels.auth : ["email"],
            onboarding_parent: Array.isArray(notificationChannels.onboarding_parent) ? notificationChannels.onboarding_parent : ["sms"],
          },
        }),
      },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: user?.id,
      action: "UPDATE_NOTIFICATION_SETTINGS",
      details: { emailNotifications, smsNotifications, pushNotifications, notificationChannels },
      ipAddress: req.ip,
    });

    res.json({ message: "Paramètres de notification mis à jour", settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};