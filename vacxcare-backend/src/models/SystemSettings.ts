import mongoose, { Schema, Document } from "mongoose";

export interface ISystemSettings extends Document {
  appName: string;
  appSubtitle?: string;
  logoUrl: string;
  primaryColor: string;
  headerColor?: string;
  headerTextColor?: string;
  headerIconColor?: string;
  sidebarBgColor?: string;
  sidebarTextColor?: string;
  accentColor?: string;
  language: string;
  timezone: string;
  // 📱 Paramètres mobile
  mobileBackgroundColor?: string;
  mobileButtonColor?: string;
  // Onboarding slides
  onboardingSlide1Image?: string;
  onboardingSlide1Title?: string;
  onboardingSlide1Subtitle?: string;
  onboardingSlide2Image?: string;
  onboardingSlide2Title?: string;
  onboardingSlide2Subtitle?: string;
  onboardingSlide3Image?: string;
  onboardingSlide3Title?: string;
  onboardingSlide3Subtitle?: string;
  // Dashboard header slides
  dashboardSlide1Image?: string;
  dashboardSlide1Title?: string;
  dashboardSlide1Subtitle?: string;
  dashboardSlide2Image?: string;
  dashboardSlide2Title?: string;
  dashboardSlide2Subtitle?: string;
  dashboardSlide3Image?: string;
  dashboardSlide3Title?: string;
  dashboardSlide3Subtitle?: string;
  // Autres paramètres
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notificationEmail?: string;
  notificationPhone?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  backupEnabled: boolean;
  backupFrequency: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireSpecialChar: boolean;
  twoFactorEnabled: boolean;
  notificationChannels: {
    alerts: ("inapp" | "email" | "sms")[];
    auth: ("inapp" | "email" | "sms")[];
    onboarding_parent: ("inapp" | "email" | "sms")[];
  };
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    appName: { type: String, default: "VacXCare" },
    appSubtitle: { type: String, default: "Santé de votre enfant simplifiée" },
    logoUrl: { type: String, default: "/logo.png" },
    primaryColor: { type: String, default: "#2563eb" },
    // 🎨 Thème
    headerColor: { type: String, default: "#ffffff" },
    headerTextColor: { type: String, default: "#1f2937" },
    headerIconColor: { type: String, default: "#6b7280" },
    sidebarBgColor: { type: String, default: "#0A1A33" },
    sidebarTextColor: { type: String, default: "#ffffff" },
    accentColor: { type: String, default: "#2563eb" },
    language: { type: String, default: "fr" },
    timezone: { type: String, default: "Africa/Dakar" },
    // 📱 Paramètres mobile
    mobileBackgroundColor: { type: String, default: "#0A1A33" },
    mobileButtonColor: { type: String, default: "#3B760F" },
    // Onboarding slides
    onboardingSlide1Image: { type: String },
    onboardingSlide1Title: { type: String, default: "Calendrier vaccinal simplifié" },
    onboardingSlide1Subtitle: { type: String, default: "Consultez tous les rendez-vous de vaccination de vos enfants en un seul endroit." },
    onboardingSlide2Image: { type: String },
    onboardingSlide2Title: { type: String, default: "Suivi professionnel et personnalisé" },
    onboardingSlide2Subtitle: { type: String, default: "Des agents de santé qualifiés pour accompagner chaque étape de la vaccination." },
    onboardingSlide3Image: { type: String },
    onboardingSlide3Title: { type: String, default: "Notifications et rappels intelligents" },
    onboardingSlide3Subtitle: { type: String, default: "Ne manquez plus jamais un vaccin important pour la santé de votre enfant." },
    // Dashboard header slides
    dashboardSlide1Image: { type: String },
    dashboardSlide1Title: { type: String, default: "Suivi Vaccinal Complet" },
    dashboardSlide1Subtitle: { type: String, default: "Tous les vaccins de votre enfant en un clin d'œil" },
    dashboardSlide2Image: { type: String },
    dashboardSlide2Title: { type: String, default: "Rendez-vous à Venir" },
    dashboardSlide2Subtitle: { type: String, default: "Ne manquez jamais un rendez-vous important" },
    dashboardSlide3Image: { type: String },
    dashboardSlide3Title: { type: String, default: "Santé de Votre Enfant" },
    dashboardSlide3Subtitle: { type: String, default: "Suivez la croissance et le développement" },
    // Autres paramètres
    notificationsEnabled: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: false },
    notificationEmail: { type: String },
    notificationPhone: { type: String },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String },
    backupEnabled: { type: Boolean, default: true },
    backupFrequency: { type: String, default: "daily" },
    sessionTimeout: { type: Number, default: 3600 },
    maxLoginAttempts: { type: Number, default: 5 },
    passwordMinLength: { type: Number, default: 8 },
    requireSpecialChar: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    notificationChannels: {
      type: new Schema(
        {
          alerts: { type: [String], default: ["inapp"] },
          auth: { type: [String], default: ["email"] },
          onboarding_parent: { type: [String], default: ["sms"] },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISystemSettings>("SystemSettings", SystemSettingsSchema);