import { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";

/* -------------------------------------------------------------------------- */
/* 🛡️ Middleware de validation des erreurs                                   */
/* -------------------------------------------------------------------------- */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("❌ Erreurs de validation:", errors.array());
    return res.status(400).json({
      error: "Données invalides",
      details: errors.array().map((err: any) => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined
      }))
    });
  }
  next();
};

/* -------------------------------------------------------------------------- */
/* 👤 Validations Utilisateur                                                */
/* -------------------------------------------------------------------------- */
export const validateUserCreation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email invalide"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Le mot de passe doit contenir au moins 8 caractères")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"),
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Le prénom doit contenir entre 2 et 50 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Le nom doit contenir entre 2 et 50 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("role")
    .isIn(["agent", "regional", "national"])
    .withMessage("Rôle invalide"),
  body("region")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("La région doit contenir entre 2 et 100 caractères"),
  body("healthCenter")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le centre de santé doit contenir entre 2 et 100 caractères"),
  handleValidationErrors
];

export const validateUserUpdate = [
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Email invalide"),
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Le prénom doit contenir entre 2 et 50 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Le nom doit contenir entre 2 et 50 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("role")
    .optional()
    .isIn(["agent", "regional", "national"])
    .withMessage("Rôle invalide"),
  body("region")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("La région doit contenir entre 2 et 100 caractères"),
  body("healthCenter")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le centre de santé doit contenir entre 2 et 100 caractères"),
  handleValidationErrors
];

/* -------------------------------------------------------------------------- */
/* 👶 Validations Enfant                                                     */
/* -------------------------------------------------------------------------- */
export const validateChildCreation = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Le prénom doit contenir entre 2 et 50 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Le nom doit contenir entre 2 et 50 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("Date de naissance invalide")
    .custom((value: any) => {
      const birthDate = new Date(value);
      const now = new Date();
      const maxAge = new Date();
      maxAge.setFullYear(now.getFullYear() - 18); // Maximum 18 ans
      
      if (birthDate > now) {
        throw new Error("La date de naissance ne peut pas être dans le futur");
      }
      if (birthDate < maxAge) {
        throw new Error("L'enfant ne peut pas avoir plus de 18 ans");
      }
      return true;
    }),
  body("gender")
    .isIn(["M", "F"])
    .withMessage("Le sexe doit être M ou F"),
  body("parentInfo.motherName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le nom de la mère doit contenir entre 2 et 100 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le nom de la mère ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("parentInfo.fatherName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le nom du père doit contenir entre 2 et 100 caractères")
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage("Le nom du père ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  body("parentInfo.phone")
    .optional()
    .matches(/^(\+221|221)?[0-9]{9}$/)
    .withMessage("Numéro de téléphone invalide (format Sénégal)"),
  body("medicalInfo.birthWeight")
    .optional()
    .isFloat({ min: 0.5, max: 10 })
    .withMessage("Le poids de naissance doit être entre 0.5 et 10 kg"),
  body("medicalInfo.birthHeight")
    .optional()
    .isFloat({ min: 20, max: 80 })
    .withMessage("La taille de naissance doit être entre 20 et 80 cm"),
  body("medicalInfo.allergies")
    .optional()
    .isArray()
    .withMessage("Les allergies doivent être un tableau"),
  body("medicalInfo.allergies.*")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Chaque allergie doit contenir entre 2 et 100 caractères"),
  handleValidationErrors
];

/* -------------------------------------------------------------------------- */
/* 💉 Validations Vaccination                                                */
/* -------------------------------------------------------------------------- */
export const validateVaccinationCreation = [
  body("childId")
    .isMongoId()
    .withMessage("ID enfant invalide"),
  body("vaccineName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le nom du vaccin doit contenir entre 2 et 100 caractères"),
  body("scheduledDate")
    .isISO8601()
    .withMessage("Date programmée invalide")
    .custom((value: any) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 2); // Maximum 2 ans dans le futur
      
      if (scheduledDate < now) {
        throw new Error("La date programmée ne peut pas être dans le passé");
      }
      if (scheduledDate > maxDate) {
        throw new Error("La date programmée ne peut pas être plus de 2 ans dans le futur");
      }
      return true;
    }),
  body("dose")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("La dose doit être un nombre entre 1 et 10"),
  body("ageAtVaccination")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("L'âge à la vaccination doit contenir entre 1 et 50 caractères"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Les notes ne peuvent pas dépasser 500 caractères"),
  handleValidationErrors
];

/* -------------------------------------------------------------------------- */
/* 📅 Validations Rendez-vous                                               */
/* -------------------------------------------------------------------------- */
export const validateAppointmentCreation = [
  body("childId")
    .isMongoId()
    .withMessage("ID enfant invalide"),
  body("vaccineName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le nom du vaccin doit contenir entre 2 et 100 caractères"),
  body("appointmentDate")
    .isISO8601()
    .withMessage("Date de rendez-vous invalide")
    .custom((value: any) => {
      const appointmentDate = new Date(value);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 1); // Maximum 1 an dans le futur
      
      if (appointmentDate < now) {
        throw new Error("La date de rendez-vous ne peut pas être dans le passé");
      }
      if (appointmentDate > maxDate) {
        throw new Error("La date de rendez-vous ne peut pas être plus d'1 an dans le futur");
      }
      return true;
    }),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Les notes ne peuvent pas dépasser 500 caractères"),
  handleValidationErrors
];

/* -------------------------------------------------------------------------- */
/* 🔐 Validations Authentification                                           */
/* -------------------------------------------------------------------------- */
export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email invalide"),
  body("password")
    .isLength({ min: 1 })
    .withMessage("Mot de passe requis"),
  handleValidationErrors
];

export const validatePasswordReset = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email invalide"),
  handleValidationErrors
];

export const validatePasswordChange = [
  body("currentPassword")
    .isLength({ min: 1 })
    .withMessage("Mot de passe actuel requis"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Le nouveau mot de passe doit contenir au moins 8 caractères")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"),
  handleValidationErrors
];

/* -------------------------------------------------------------------------- */
/* 📱 Validations Mobile                                                     */
/* -------------------------------------------------------------------------- */
export const validateMobileAuth = [
  body("childId")
    .trim()
    .isLength({ min: 6, max: 24 })
    .withMessage("ID enfant invalide")
    .custom((value: any) => {
      // Valider soit un code à 6 chiffres, soit un ObjectId MongoDB
      const isCode = /^\d{6}$/.test(value);
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(value);
      if (!isCode && !isObjectId) {
        throw new Error("ID enfant doit être un code à 6 chiffres ou un ID MongoDB valide");
      }
      return true;
    }),
  body("parentPhone")
    .matches(/^(\+221|221)?[0-9]{9}$/)
    .withMessage("Numéro de téléphone invalide (format Sénégal)"),
  handleValidationErrors
];

export const validatePinSave = [
  body("pin")
    .matches(/^\d{4}$/)
    .withMessage("Le PIN doit être composé de 4 chiffres"),
  handleValidationErrors
];

export const validatePinVerify = [
  body("pin")
    .matches(/^\d{4}$/)
    .withMessage("Le PIN doit être composé de 4 chiffres"),
  handleValidationErrors
];

/* -------------------------------------------------------------------------- */
/* 🔍 Validations Paramètres de requête                                      */
/* -------------------------------------------------------------------------- */
export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Le numéro de page doit être un entier positif"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("La limite doit être un entier entre 1 et 100"),
  handleValidationErrors
];

export const validateMongoId = [
  param("id")
    .isMongoId()
    .withMessage("ID invalide"),
  handleValidationErrors
];
