import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Mocks to avoid starting the real server/socket and cron
jest.mock('node-cron', () => ({ schedule: () => ({ start: () => {}, stop: () => {} }) }));
jest.mock('../../utils/socketManager', () => ({ sendSocketNotification: jest.fn() }));
jest.mock('../../server', () => ({ io: { to: () => ({ emit: () => {} }) } }), { virtual: true });

jest.setTimeout(60000);

import Child from '../../models/Child';
import Vaccine from '../../models/Vaccine';
import Vaccination from '../../models/Vaccination';
import Stock from '../../models/Stock';
import User from '../../models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { completeVaccination, markVaccinationMissed, cancelVaccination } from '../../controllers/vaccinationController';
import Notification from '../../models/Notification';

function createAgentToken(agent: any) {
  const payload = {
    id: agent._id.toString(),
    role: 'agent',
    email: agent.email,
    region: agent.region,
    healthCenter: agent.healthCenter,
  };
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

describe('Vaccination actions (complete/missed/cancel)', () => {
  let app: express.Express;
  let mongoServer: MongoMemoryServer;
  let agent: any;
  let agentToken: string;
  let child: any;
  let vaccine: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({ binary: { version: '7.0.3' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    // Minimal auth middleware to set req.user from Bearer token
    const auth = (req: any, res: any, next: any) => {
      const hdr = req.headers['authorization'];
      if (!hdr) return res.status(401).json({ error: 'no auth' });
      const token = hdr.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = {
          _id: decoded.id,
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
          region: decoded.region,
          healthCenter: decoded.healthCenter,
        };
        next();
      } catch {
        return res.status(403).json({ error: 'invalid token' });
      }
    };
    // Map endpoints directly to controllers (cast req as any to satisfy types)
    app.put('/api/vaccinations/:id/complete', auth, (req, res) => (completeVaccination as any)(req, res));
    app.put('/api/vaccinations/:id/missed', auth, (req, res) => (markVaccinationMissed as any)(req, res));
    app.put('/api/vaccinations/:id/cancel', auth, (req, res) => (cancelVaccination as any)(req, res));
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
    // Create agent
    agent = await User.create({
      email: `agent-${Date.now()}@test.com`,
      password: 'Secret123!',
      role: 'agent',
      region: 'Test Region',
      healthCenter: 'Centre A',
    } as any);
    agentToken = createAgentToken(agent);

    // Create vaccine
    vaccine = await Vaccine.create({ name: 'BCG', description: 'BCG' } as any);

    // Create child
    child = await Child.create({
      firstName: 'Moussa',
      lastName: 'Sow',
      birthDate: new Date('2020-06-01'),
      gender: 'M',
      parentInfo: { parentName: 'Parent Moussa', parentPhone: '221770000111' },
      createdBy: agent._id,
    } as any);

    // Seed stock for Centre A
    await Stock.create({
      vaccine: 'BCG',
      batchNumber: 'LOT123',
      quantity: 5,
      expirationDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
      region: agent.region,
      healthCenter: agent.healthCenter,
      createdBy: agent._id,
    } as any);
  });

  it('PUT /:id/complete should mark vaccination done and decrement stock', async () => {
    const v = await Vaccination.create({
      child: child._id,
      vaccine: vaccine._id,
      scheduledDate: new Date(Date.now() + 24 * 3600 * 1000),
      status: 'scheduled',
      healthCenter: 'Centre A',
      region: 'Test Region',
    } as any);

    const res = await request(app)
      .put(`/api/vaccinations/${v._id}/complete`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(res.body.message).toContain('Vaccination complétée');

    const updated = await Vaccination.findById(v._id).lean();
    expect(updated?.status).toBe('done');
    expect(updated?.doneDate).toBeTruthy();

    const stock = await Stock.findOne({ vaccine: 'BCG', healthCenter: 'Centre A' }).lean();
    expect(stock?.quantity).toBe(4);
  });

  it('PUT /:id/missed should mark vaccination missed', async () => {
    const v = await Vaccination.create({
      child: child._id,
      vaccine: vaccine._id,
      scheduledDate: new Date(Date.now() - 24 * 3600 * 1000),
      status: 'scheduled',
      healthCenter: 'Centre A',
      region: 'Test Region',
    } as any);

    const res = await request(app)
      .put(`/api/vaccinations/${v._id}/missed`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(res.body.message).toContain('raté');

    const updated = await Vaccination.findById(v._id).lean();
    expect(updated?.status).toBe('missed');
  });

  it('PUT /:id/cancel should mark vaccination cancelled and save reason in notes', async () => {
    const v = await Vaccination.create({
      child: child._id,
      vaccine: vaccine._id,
      scheduledDate: new Date(Date.now() + 48 * 3600 * 1000),
      status: 'scheduled',
      healthCenter: 'Centre A',
      region: 'Test Region',
    } as any);

    const reason = 'Rupture de stock';
    const res = await request(app)
      .put(`/api/vaccinations/${v._id}/cancel`)
      .send({ reason })
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(res.body.message).toContain('annulée');

    const updated = await Vaccination.findById(v._id).lean();
    expect(updated?.status).toBe('cancelled');
    expect(updated?.notes).toContain(reason);
  });

  it('PUT /:id/reschedule should move a missed vaccination back to scheduled and create a notification', async () => {
    // Create a missed vaccination
    const missed = await Vaccination.create({
      child: child._id,
      vaccine: vaccine._id,
      scheduledDate: new Date(Date.now() - 48 * 3600 * 1000),
      status: 'missed',
      healthCenter: 'Centre A',
      region: 'Test Region',
    } as any);

    // Expose a minimal route for reschedule using the controller directly
    const { rescheduleVaccination } = require('../../controllers/vaccinationController');
    (app as any).put('/api/vaccinations/:id/reschedule', (req: any, res: any, next: any) => {
      // Reuse auth already mounted at top via our mini auth middleware
      return (rescheduleVaccination as any)(req, res, next);
    });

    const newDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    const res = await request(app)
      .put(`/api/vaccinations/${missed._id}/reschedule`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ scheduledDate: newDate })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.vaccination.status).toBe('scheduled');
    expect(new Date(res.body.vaccination.scheduledDate).toISOString()).toBe(newDate);

    const notifCount = await Notification.countDocuments({
      type: 'vaccination',
      'metadata.childId': String(child._id),
      title: /reprogrammé/i,
    });
    expect(notifCount).toBeGreaterThanOrEqual(1);
  });
});
