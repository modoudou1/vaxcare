import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { jest, expect, beforeAll, afterEach, afterAll } from '@jest/globals';

// Désactiver node-cron pendant les tests pour éviter les handles ouverts
jest.mock('node-cron', () => ({
  schedule: () => ({ start: () => {}, stop: () => {} })
}));

// Augmenter le timeout global des tests (mongodb-memory-server peut prendre du temps)
jest.setTimeout(30000);

/* -------------------------------------------------------------------------- */
/* 🧪 Configuration des tests                                                */
/* -------------------------------------------------------------------------- */
let mongoServer: MongoMemoryServer;

/**
 * Configurer la base de données de test en mémoire
 */
export const setupTestDatabase = async (): Promise<void> => {
  // Créer une instance MongoDB en mémoire (version fixée pour compatibilité)
  mongoServer = await MongoMemoryServer.create({
    binary: { version: '7.0.3' }
  });
  const mongoUri = mongoServer.getUri();

  // Se connecter à la base de données de test
  await mongoose.connect(mongoUri);
  
  console.log('📊 Base de données de test configurée');
};

/**
 * Nettoyer la base de données de test
 */
export const cleanupTestDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    // Supprimer toutes les collections
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

/**
 * Fermer la base de données de test
 */
export const teardownTestDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('📊 Base de données de test fermée');
};

/* -------------------------------------------------------------------------- */
/* 🔧 Utilitaires de test                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Créer un utilisateur de test
 */
export const createTestUser = (overrides: any = {}) => ({
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'agent',
  region: 'Test Region',
  healthCenter: 'Test Center',
  active: true,
  ...overrides
});

/**
 * Créer un enfant de test
 */
export const createTestChild = (overrides: any = {}) => ({
  firstName: 'Test',
  lastName: 'Child',
  dateOfBirth: new Date('2020-01-01'),
  gender: 'M',
  parentInfo: {
    motherName: 'Test Mother',
    fatherName: 'Test Father',
    phone: '221123456789',
    address: 'Test Address'
  },
  medicalInfo: {
    birthWeight: 3.5,
    birthHeight: 50,
    allergies: [],
    medicalConditions: []
  },
  agent: new mongoose.Types.ObjectId(),
  ...overrides
});

/**
 * Créer une vaccination de test
 */
export const createTestVaccination = (overrides: any = {}) => ({
  childId: new mongoose.Types.ObjectId(),
  vaccineName: 'BCG',
  scheduledDate: new Date(),
  dose: 1,
  ageAtVaccination: '0 mois',
  status: 'scheduled',
  agent: new mongoose.Types.ObjectId(),
  ...overrides
});

/**
 * Créer un rendez-vous de test
 */
export const createTestAppointment = (overrides: any = {}) => ({
  childId: new mongoose.Types.ObjectId(),
  vaccineName: 'BCG',
  appointmentDate: new Date(),
  status: 'scheduled',
  agent: new mongoose.Types.ObjectId(),
  ...overrides
});

/* -------------------------------------------------------------------------- */
/* 🎭 Mocks et stubs                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Mock du service SMS
 */
export const mockSmsService: any = {
  sendSms: (jest.fn() as any).mockResolvedValue({ success: true }),
  sendWhatsApp: (jest.fn() as any).mockResolvedValue({ success: true })
};

/**
 * Mock du service email
 */
export const mockEmailService: any = {
  sendEmail: (jest.fn() as any).mockResolvedValue({ success: true })
};

/**
 * Mock du service de notifications
 */
export const mockNotificationService: any = {
  sendNotification: (jest.fn() as any).mockResolvedValue({ success: true }),
  sendSocketNotification: (jest.fn() as any)
};

/**
 * Mock de Socket.io
 */
export const mockSocketIo: any = {
  emit: (jest.fn() as any),
  to: (jest.fn() as any).mockReturnThis(),
  in: (jest.fn() as any).mockReturnThis()
};

/* -------------------------------------------------------------------------- */
/* 🔧 Helpers de test                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Attendre un délai spécifique
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Générer un email unique pour les tests
 */
export const generateTestEmail = (): string => {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
};

/**
 * Générer un numéro de téléphone unique pour les tests
 */
export const generateTestPhone = (): string => {
  return `221${Math.floor(100000000 + Math.random() * 900000000)}`;
};

/**
 * Créer un token JWT de test
 */
export const createTestToken = (payload: any = {}) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: new mongoose.Types.ObjectId().toString(),
      role: 'agent',
      email: 'test@example.com',
      ...payload
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

/**
 * Créer des headers d'authentification pour les tests
 */
export const createAuthHeaders = (token?: string) => {
  const authToken = token || createTestToken();
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
};

/* -------------------------------------------------------------------------- */
/* 🎯 Matchers personnalisés Jest                                            */
/* -------------------------------------------------------------------------- */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObjectId(): R;
      toBeValidDate(): R;
      toBeValidEmail(): R;
      toBeValidPhone(): R;
    }
  }
}

// Matcher pour ObjectId MongoDB
expect.extend({
  toBeValidObjectId(received: any) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    return {
      message: () => `expected ${received} to be a valid ObjectId`,
      pass
    };
  }
});

// Matcher pour les dates
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      message: () => `expected ${received} to be a valid Date`,
      pass
    };
  }
});

// Matcher pour les emails
expect.extend({
  toBeValidEmail(received: any) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid email`,
      pass
    };
  }
});

// Matcher pour les numéros de téléphone sénégalais
expect.extend({
  toBeValidPhone(received: any) {
    const phoneRegex = /^(\+221|221)?[0-9]{9}$/;
    const pass = typeof received === 'string' && phoneRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid Senegal phone number`,
      pass
    };
  }
});

/* -------------------------------------------------------------------------- */
/* 🔧 Configuration Jest globale                                             */
/* -------------------------------------------------------------------------- */

// Configuration avant tous les tests
beforeAll(async () => {
  await setupTestDatabase();
});

// Nettoyage après chaque test
afterEach(async () => {
  await cleanupTestDatabase();
  jest.clearAllMocks();
});

// Nettoyage après tous les tests
afterAll(async () => {
  await teardownTestDatabase();
});
