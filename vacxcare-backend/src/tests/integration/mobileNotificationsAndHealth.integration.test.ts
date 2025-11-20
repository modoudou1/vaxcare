import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('node-cron', () => ({ schedule: () => ({ start: () => {}, stop: () => {} }) }));

jest.setTimeout(60000);

import mobileRoutes from '../../routes/mobile';
import Child from '../../models/Child';
import Notification from '../../models/Notification';
import { healthCheckRoute, readinessRoute, livenessRoute } from '../../utils/monitoring';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Tests: notifications mobiles + routes de santé
 */
describe('Mobile notifications and health endpoints (integration)', () => {
  let app: express.Express;
  let mongoServer: MongoMemoryServer;
  let child: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({ binary: { version: '7.0.3' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/mobile', mobileRoutes);

    // Exposer les routes de santé directement
    app.get('/health', healthCheckRoute);
    app.get('/ready', readinessRoute);
    app.get('/alive', livenessRoute);
  });

  afterEach(async () => {
    const { collections } = mongoose.connection;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    child = await Child.create({
      firstName: 'Aminata',
      lastName: 'Ba',
      birthDate: new Date('2020-03-15'),
      gender: 'F',
      parentInfo: { parentName: 'Parent Aminata', parentPhone: '221770002233' },
      createdBy: new mongoose.Types.ObjectId(),
    } as any);

    // Obtenir le token parent
    const auth = await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: (child as any).parentAccessCode, parentPhone: '221770002233' })
      .expect(200);

    token = auth.body.token;
  });

  it('GET /api/mobile/children/:id/notifications should return recent notifications (includes seeded)', async () => {
    // Semer une notification liée à l'enfant via metadata.childId
    await Notification.create({
      title: 'Info',
      message: 'Test notification parent',
      type: 'vaccination',
      metadata: { childId: (child as any)._id.toString() }
    } as any);

    const res = await request(app)
      .get(`/api/mobile/children/${(child as any)._id}/notifications`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const found = res.body.find((n: any) => n.message?.includes('Test notification parent'));
    expect(Boolean(found)).toBe(true);
  });

  it('Health endpoints should respond with 200/ready states', async () => {
    const alive = await request(app).get('/alive').expect(200);
    expect(alive.body.status).toBe('alive');

    const ready = await request(app).get('/ready').expect(200);
    expect(ready.body.status).toBe('ready');

    const health = await request(app).get('/health').expect(200);
    expect(['healthy', 'degraded']).toContain(health.body.status);
  });
});
