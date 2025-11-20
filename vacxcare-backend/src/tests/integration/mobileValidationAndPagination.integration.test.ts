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
import Vaccine from '../../models/Vaccine';
import Vaccination from '../../models/Vaccination';
import Appointment from '../../models/Appointment';
import Notification from '../../models/Notification';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Tests: validations erreurs (400) et pagination/tri
 */
describe('Mobile validation errors and pagination/sorting (integration)', () => {
  let app: express.Express;
  let mongoServer: MongoMemoryServer;
  let child: any;
  let token: string;
  let vaccine: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({ binary: { version: '7.0.3' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/mobile', mobileRoutes);
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
    vaccine = await Vaccine.create({ name: 'BCG', description: 'BCG' } as any);
    child = await Child.create({
      firstName: 'Pagy',
      lastName: 'Test',
      birthDate: new Date('2020-01-01'),
      gender: 'M',
      parentInfo: { parentName: 'Parent Pagy', parentPhone: '221770008888' },
      createdBy: new mongoose.Types.ObjectId(),
    } as any);

    const clientIp = `8.8.8.${Math.floor(Math.random()*200)+1}`;
    const auth = await request(app)
      .post('/api/mobile/parent-link-auth')
      .set('X-Forwarded-For', clientIp)
      .send({ childId: (child as any).parentAccessCode, parentPhone: '221770008888' })
      .expect(200);

    token = auth.body.token;
  });

  it('parent-link-auth returns 400 when missing fields', async () => {
    await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: (child as any).parentAccessCode })
      .expect(400);
  });

  it('parent-pin/save returns 400 when missing pin', async () => {
    await request(app)
      .post('/api/mobile/parent-pin/save')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId: String(child._id), parentPhone: '221770008888' })
      .expect(400);
  });

  it('notifications pagination: limit=2 returns 2 sorted by createdAt desc', async () => {
    // Seed three notifications with increasing timestamps
    await Notification.create({ title: 'N1', message: 'old', type: 'vaccination', metadata: { childId: String(child._id) }, createdAt: new Date(Date.now() - 3000) } as any);
    await Notification.create({ title: 'N2', message: 'mid', type: 'vaccination', metadata: { childId: String(child._id) }, createdAt: new Date(Date.now() - 2000) } as any);
    await Notification.create({ title: 'N3', message: 'new', type: 'vaccination', metadata: { childId: String(child._id) }, createdAt: new Date(Date.now() - 1000) } as any);

    const res = await request(app)
      .get(`/api/mobile/children/${child._id}/notifications`)
      .query({ limit: 2 })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    // Should include the two newest: N3 and N2
    const messages = res.body.map((n: any) => n.message);
    expect(messages).toContain('new');
    expect(messages).toContain('mid');
  });

  it('appointments sorting: scheduled appears before done', async () => {
    // done in the future (should be after scheduled items in output)
    await Vaccination.create({ child: child._id, vaccine: vaccine._id, doneDate: new Date(Date.now() + 24*3600*1000), status: 'done' } as any);
    // scheduled earlier
    await Vaccination.create({ child: child._id, vaccine: vaccine._id, scheduledDate: new Date(Date.now() + 12*3600*1000), status: 'scheduled' } as any);

    const res = await request(app)
      .get(`/api/mobile/children/${child._id}/appointments`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const statuses = res.body.map((x: any) => x.status);
    // First should include a scheduled/planned before done
    const firstScheduledIndex = statuses.indexOf('scheduled');
    const firstDoneIndex = statuses.indexOf('done');
    expect(firstScheduledIndex).toBeGreaterThanOrEqual(0);
    expect(firstDoneIndex).toBeGreaterThanOrEqual(0);
    expect(firstScheduledIndex).toBeLessThan(firstDoneIndex);
  });
});
