import dotenv from 'dotenv';
import { logger } from '../utils/logger';

/* -------------------------------------------------------------------------- */
/* 🔧 Types de configuration                                                 */
/* -------------------------------------------------------------------------- */
export interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    bufferMaxEntries: number;
  };
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phone: string;
  whatsappFrom: string;
  mockSms: boolean;
}

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  trustProxy: boolean;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  checkPeriod: number;
}

export interface SecurityConfig {
  rateLimitWindow: number;
  rateLimitMax: number;
  bcryptRounds: number;
  sessionTimeout: number;
}

export interface AppConfig {
  database: DatabaseConfig;
  jwt: JWTConfig;
  smtp: SMTPConfig;
  twilio: TwilioConfig;
  server: ServerConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/* -------------------------------------------------------------------------- */
/* 🔧 Validation des variables d'environnement                               */
/* -------------------------------------------------------------------------- */
class ConfigValidator {
  private errors: string[] = [];

  /**
   * Valider qu'une variable existe
   */
  required(key: string, value: string | undefined): string {
    if (!value || value.trim() === '') {
      this.errors.push(`Variable d'environnement requise manquante: ${key}`);
      return '';
    }
    return value.trim();
  }

  /**
   * Valider un nombre
   */
  number(key: string, value: string | undefined, defaultValue?: number): number {
    if (!value) {
      if (defaultValue !== undefined) return defaultValue;
      this.errors.push(`Variable d'environnement numérique requise manquante: ${key}`);
      return 0;
    }
    
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      this.errors.push(`Variable d'environnement ${key} doit être un nombre valide`);
      return defaultValue || 0;
    }
    
    return num;
  }

  /**
   * Valider un booléen
   */
  boolean(key: string, value: string | undefined, defaultValue: boolean = false): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * Valider une URL
   */
  url(key: string, value: string | undefined): string {
    const url = this.required(key, value);
    if (url && !this.isValidUrl(url)) {
      this.errors.push(`Variable d'environnement ${key} doit être une URL valide`);
    }
    return url;
  }

  /**
   * Valider un email
   */
  email(key: string, value: string | undefined): string {
    const email = this.required(key, value);
    if (email && !this.isValidEmail(email)) {
      this.errors.push(`Variable d'environnement ${key} doit être un email valide`);
    }
    return email;
  }

  /**
   * Valider une liste séparée par des virgules
   */
  array(key: string, value: string | undefined, defaultValue: string[] = []): string[] {
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  /**
   * Obtenir les erreurs de validation
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * Vérifier si il y a des erreurs
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔧 Chargement de la configuration                                         */
/* -------------------------------------------------------------------------- */
export function loadConfig(): AppConfig {
  // Charger le fichier .env approprié selon l'environnement
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'test' ? '.env.test' : 
                  nodeEnv === 'production' ? '.env.production' : '.env';
  
  dotenv.config({ path: envFile });
  
  const validator = new ConfigValidator();
  
  // Configuration de base de données
  const database: DatabaseConfig = {
    uri: validator.required('MONGO_URI', process.env.MONGO_URI),
    options: {
      maxPoolSize: validator.number('DB_MAX_POOL_SIZE', process.env.DB_MAX_POOL_SIZE, 10),
      serverSelectionTimeoutMS: validator.number('DB_SERVER_SELECTION_TIMEOUT', process.env.DB_SERVER_SELECTION_TIMEOUT, 5000),
      socketTimeoutMS: validator.number('DB_SOCKET_TIMEOUT', process.env.DB_SOCKET_TIMEOUT, 45000),
      bufferMaxEntries: validator.number('DB_BUFFER_MAX_ENTRIES', process.env.DB_BUFFER_MAX_ENTRIES, 0)
    }
  };

  // Configuration JWT
  const jwt: JWTConfig = {
    secret: validator.required('JWT_SECRET', process.env.JWT_SECRET),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  };

  // Configuration SMTP
  const smtp: SMTPConfig = {
    host: validator.required('SMTP_HOST', process.env.SMTP_HOST),
    port: validator.number('SMTP_PORT', process.env.SMTP_PORT, 587),
    user: validator.required('SMTP_USER', process.env.SMTP_USER),
    pass: validator.required('SMTP_PASS', process.env.SMTP_PASS),
    secure: validator.boolean('SMTP_SECURE', process.env.SMTP_SECURE, false)
  };

  // Configuration Twilio
  const twilio: TwilioConfig = {
    accountSid: validator.required('TWILIO_ACCOUNT_SID', process.env.TWILIO_ACCOUNT_SID),
    authToken: validator.required('TWILIO_AUTH_TOKEN', process.env.TWILIO_AUTH_TOKEN),
    phone: validator.required('TWILIO_PHONE', process.env.TWILIO_PHONE),
    whatsappFrom: validator.required('TWILIO_WHATSAPP_FROM', process.env.TWILIO_WHATSAPP_FROM),
    mockSms: validator.boolean('MOCK_SMS', process.env.MOCK_SMS, false)
  };

  // Configuration serveur
  const server: ServerConfig = {
    port: validator.number('PORT', process.env.PORT, 5000),
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: validator.array('CORS_ORIGINS', process.env.CORS_ORIGINS, ['http://localhost:3000']),
    trustProxy: validator.boolean('TRUST_PROXY', process.env.TRUST_PROXY, false)
  };

  // Configuration cache
  const cache: CacheConfig = {
    defaultTTL: validator.number('CACHE_DEFAULT_TTL', process.env.CACHE_DEFAULT_TTL, 300000), // 5 minutes
    maxSize: validator.number('CACHE_MAX_SIZE', process.env.CACHE_MAX_SIZE, 1000),
    checkPeriod: validator.number('CACHE_CHECK_PERIOD', process.env.CACHE_CHECK_PERIOD, 600000) // 10 minutes
  };

  // Configuration sécurité
  const security: SecurityConfig = {
    rateLimitWindow: validator.number('RATE_LIMIT_WINDOW', process.env.RATE_LIMIT_WINDOW, 900000), // 15 minutes
    rateLimitMax: validator.number('RATE_LIMIT_MAX', process.env.RATE_LIMIT_MAX, 1000),
    bcryptRounds: validator.number('BCRYPT_ROUNDS', process.env.BCRYPT_ROUNDS, 12),
    sessionTimeout: validator.number('SESSION_TIMEOUT', process.env.SESSION_TIMEOUT, 86400000) // 24 heures
  };

  // Vérifier les erreurs de validation
  if (validator.hasErrors()) {
    const errors = validator.getErrors();
    console.error('❌ Erreurs de configuration:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  const config: AppConfig = {
    database,
    jwt,
    smtp,
    twilio,
    server,
    cache,
    security,
    nodeEnv: nodeEnv as 'development' | 'production' | 'test',
    logLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info'
  };

  // Logger la configuration (sans les secrets)
  const safeConfig = {
    ...config,
    jwt: { ...config.jwt, secret: '[HIDDEN]' },
    smtp: { ...config.smtp, pass: '[HIDDEN]' },
    twilio: { ...config.twilio, authToken: '[HIDDEN]' }
  };

  logger.info('Configuration chargée', safeConfig);

  return config;
}

/* -------------------------------------------------------------------------- */
/* 🔧 Validation de l'environnement                                          */
/* -------------------------------------------------------------------------- */
export function validateEnvironment(): void {
  const requiredVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error('\n💡 Créez un fichier .env avec ces variables ou définissez-les dans votre environnement.');
    process.exit(1);
  }

  // Vérifications spécifiques à l'environnement de production
  if (process.env.NODE_ENV === 'production') {
    const productionChecks = [
      {
        condition: process.env.JWT_SECRET === 'monSuperSecret',
        message: 'JWT_SECRET ne doit pas utiliser la valeur par défaut en production'
      },
      {
        condition: !process.env.TRUST_PROXY,
        message: 'TRUST_PROXY devrait être activé en production si vous utilisez un proxy inverse'
      },
      {
        condition: process.env.LOG_LEVEL === 'debug',
        message: 'LOG_LEVEL ne devrait pas être "debug" en production'
      }
    ];

    const warnings = productionChecks.filter(check => check.condition);
    if (warnings.length > 0) {
      console.warn('⚠️  Avertissements de configuration pour la production:');
      warnings.forEach(warning => {
        console.warn(`  - ${warning.message}`);
      });
    }
  }

  logger.info('✅ Validation de l\'environnement réussie');
}

/* -------------------------------------------------------------------------- */
/* 🔧 Configuration par défaut                                               */
/* -------------------------------------------------------------------------- */
export const config = loadConfig();

/* -------------------------------------------------------------------------- */
/* 🔧 Utilitaires de configuration                                           */
/* -------------------------------------------------------------------------- */
export const isDevelopment = (): boolean => config.nodeEnv === 'development';
export const isProduction = (): boolean => config.nodeEnv === 'production';
export const isTest = (): boolean => config.nodeEnv === 'test';

export const getDbUri = (): string => config.database.uri;
export const getJwtSecret = (): string => config.jwt.secret;
export const getServerPort = (): number => config.server.port;
