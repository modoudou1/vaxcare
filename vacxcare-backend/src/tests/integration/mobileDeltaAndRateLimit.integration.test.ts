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
 * Tests: Delta API (?since, ?limit) + Rate limit auth endpoints
 */
describe('Mobile Delta API and Rate Limit (integration)', () => {
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
      firstName: 'Delta',
      lastName: 'Child',
      birthDate: new Date('2020-01-01'),
      gender: 'M',
      parentInfo: { parentName: 'Parent Delta', parentPhone: '221770009999' },
      createdBy: new mongoose.Types.ObjectId(),
    } as any);

    const auth = await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: (child as any).parentAccessCode, parentPhone: '221770009999' })
      .expect(200);

    token = auth.body.token;
  });

  it('Vaccinations delta: ?since returns only new items', async () => {
    // seed older
    const v1 = await Vaccination.create({
      child: child._id,
      vaccine: vaccine._id,
      scheduledDate: new Date(Date.now() + 24*3600*1000),
      status: 'scheduled',
    } as any);

    const t0 = new Date().toISOString();

    // seed newer
    await new Promise(r => setTimeout(r, 50));
    const v2 = await Vaccination.create({
      child: child._id,
      vaccine: vaccine._id,
      scheduledDate: new Date(Date.now() + 48*3600*1000),
      status: 'scheduled',
    } as any);

    const full = await request(app)
      .get(`/api/mobile/children/${child._id}/vaccinations`)
      .expect(200);
    expect(full.body.vaccinations.length).toBeGreaterThanOrEqual(2);

    const delta = await request(app)
      .get(`/api/mobile/children/${child._id}/vaccinations`)
      .query({ since: t0, limit: 10 })
      .expect(200);
    expect(delta.body.vaccinations.length).toBeGreaterThanOrEqual(1);
    const ids = delta.body.vaccinations.map((x: any) => String(x._id));
    expect(ids).toContain(String(v2._id));
  });

  it('Appointments delta: ?since and ?limit clip results', async () => {
    // seed vacc as appointment source
    await Vaccination.create({ child: child._id, vaccine: vaccine._id, scheduledDate: new Date(Date.now() + 24*3600*1000), status: 'scheduled' } as any);
    const t0 = new Date().toISOString();
    await new Promise(r => setTimeout(r, 50));
    await Appointment.create({ child: child._id, vaccine: vaccine._id, date: new Date(Date.now() + 72*3600*1000), status: 'confirmed', healthCenter: 'Centre A' } as any);

    const delta = await request(app)
      .get(`/api/mobile/children/${child._id}/appointments`)
      .query({ since: t0, limit: 1 })
      .expect(200);
    expect(Array.isArray(delta.body)).toBe(true);
    expect(delta.body.length).toBeLessThanOrEqual(1);
  });

  it('Notifications delta by childId', async () => {
    await Notification.create({ title: 'A', message: 'old', type: 'vaccination', metadata: { childId: String(child._id) } } as any);
    const t0 = new Date().toISOString();
    await new Promise(r => setTimeout(r, 50));
    await Notification.create({ title: 'B', message: 'new', type: 'vaccination', metadata: { childId: String(child._id) } } as any);

    const delta = await request(app)
      .get(`/api/mobile/children/${child._id}/notifications`)
      .query({ since: t0, limit: 5 })
      .expect(200);
    expect(delta.body.find((n: any) => n.message === 'new')).toBeTruthy();
  });

  it('Rate limit: parent-link-auth returns 429 after too many rapid calls', async () => {
    const clientIp = '9.9.9.9';
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/mobile/parent-link-auth')
        .set('X-Forwarded-For', clientIp)
        .send({ childId: (child as any).parentAccessCode, parentPhone: '221770009999' })
        .expect(200);
    }
    // 6th within window should be limited
    const blocked = await request(app)
      .post('/api/mobile/parent-link-auth')
      .set('X-Forwarded-For', clientIp)
      .send({ childId: (child as any).parentAccessCode, parentPhone: '221770009999' })
      .expect(429);
    expect(blocked.status).toBe(429);
  });
});
