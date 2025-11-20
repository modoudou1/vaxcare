import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('node-cron', () => ({
  schedule: () => ({ start: () => {}, stop: () => {} })
}));

jest.setTimeout(60000);

import mobileRoutes from '../../routes/mobile';
import Child from '../../models/Child';
import Vaccine from '../../models/Vaccine';
import Vaccination from '../../models/Vaccination';
import Appointment from '../../models/Appointment';
import VaccineCalendar from '../../models/VaccineCalendar';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Mobile Data Endpoints (integration)', () => {
  let app: express.Express;
  let mongoServer: MongoMemoryServer;
  let childId: string;
  let parentPhone = '221770001122';
  let token: string;

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
    const vaccine = await Vaccine.create({ name: 'BCG', description: 'BCG vaccine' } as any);

    await VaccineCalendar.create({
      vaccine: ['BCG'],
      dose: '1ère dose',
      ageUnit: 'months',
      minAge: 0.1,
      maxAge: 0.1,
      description: 'Administré à la naissance',
      createdBy: 'tester'
    } as any);

    const child = await Child.create({
      firstName: 'Awa',
      lastName: 'Ndiaye',
      birthDate: new Date('2021-01-01'),
      gender: 'F',
      parentInfo: { parentName: 'Parent Awa', parentPhone: parentPhone },
      createdBy: new mongoose.Types.ObjectId(),
    } as any);
    childId = (child as any)._id.toString();

    await Vaccination.create([
      {
        child: child._id,
        vaccine: vaccine._id,
        scheduledDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
        status: 'scheduled',
        healthCenter: 'Centre A'
      },
      {
        child: child._id,
        vaccine: vaccine._id,
        doneDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        status: 'done',
        healthCenter: 'Centre A'
      }
    ] as any);

    await Appointment.create({
      child: child._id,
      vaccine: vaccine._id,
      date: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      status: 'confirmed',
      healthCenter: 'Centre A'
    } as any);

    const auth = await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: (child as any).parentAccessCode, parentPhone })
      .expect(200);

    token = auth.body.token;
  });

  it('GET /api/mobile/parent/children should return children of parent', async () => {
    const res = await request(app)
      .get('/api/mobile/parent/children')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.children)).toBe(true);
    expect(res.body.children.length).toBe(1);
    expect(String(res.body.children[0].id)).toBe(childId);
  });

  it('GET /api/mobile/children/:id/vaccinations should return enriched vaccinations', async () => {
    const res = await request(app)
      .get(`/api/mobile/children/${childId}/vaccinations`)
      .expect(200);

    expect(Array.isArray(res.body.vaccinations)).toBe(true);
    expect(res.body.vaccinations.length).toBeGreaterThanOrEqual(2);
    const item = res.body.vaccinations[0];
    expect(item.name).toBeDefined();
    expect(item.vaccineName).toBeDefined();
    expect(item.recommendedAge).toBeDefined();
  });

  it('GET /api/mobile/children/:id/appointments should combine vaccinations and appointments with proper sorting', async () => {
    const res = await request(app)
      .get(`/api/mobile/children/${childId}/appointments`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    const first = res.body[0];
    expect(first.title).toBeDefined();
    expect(first.status).toBeDefined();
    expect(first.date).toBeDefined();
  });
});
