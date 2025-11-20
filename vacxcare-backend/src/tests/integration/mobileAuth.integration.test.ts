import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Mock node-cron pour éviter des handles ouverts
jest.mock('node-cron', () => ({
  schedule: () => ({ start: () => {}, stop: () => {} })
}));

jest.setTimeout(60000);

import mobileRoutes from '../../routes/mobile';
import Child from '../../models/Child';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Mobile Parent Auth Flow (integration)', () => {
  let app: express.Express;
  let mongoServer: MongoMemoryServer;
  let childId: string;
  let parentAccessCode: string;
  const parentPhoneCanonical = '221771112233';
  const parentPhoneInput = '+221 77 111 22 33';

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
    const child = await Child.create({
      firstName: 'Fatou',
      lastName: 'Diop',
      birthDate: new Date('2021-05-10'),
      gender: 'F',
      parentInfo: {
        parentName: 'Maman Fatou',
        parentPhone: parentPhoneCanonical,
      },
      createdBy: new mongoose.Types.ObjectId(),
    } as any);

    childId = (child as any)._id.toString();
    parentAccessCode = (child as any).parentAccessCode!;
  });

  it('should authenticate parent with 6-digit access code and return JWT + hasPin=false', async () => {
    const res = await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: parentAccessCode, parentPhone: parentPhoneInput })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.hasPin).toBe(false);
    expect(res.body.parentAccessCode).toBe(parentAccessCode);
    expect(res.body.child).toBeDefined();
    expect(String(res.body.child.id)).toBe(childId);
  });

  it('should save a 4-digit PIN for the parent', async () => {
    const auth = await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: parentAccessCode, parentPhone: parentPhoneInput })
      .expect(200);

    const token = auth.body.token as string;
    expect(token).toBeDefined();

    const res = await request(app)
      .post('/api/mobile/parent-pin/save')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, parentPhone: parentPhoneInput, pin: '1234' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should verify the saved PIN successfully', async () => {
    const auth = await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: parentAccessCode, parentPhone: parentPhoneInput })
      .expect(200);

    const token = auth.body.token as string;

    await request(app)
      .post('/api/mobile/parent-pin/save')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, parentPhone: parentPhoneInput, pin: '1234' })
      .expect(200);

    const verify = await request(app)
      .post('/api/mobile/parent-pin/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, parentPhone: parentPhoneInput, pin: '1234' })
      .expect(200);

    expect(verify.body.success).toBe(true);
    expect(verify.body.child).toBeDefined();
    expect(String(verify.body.child.id)).toBe(childId);
  });

  it('should reject wrong PIN with 401', async () => {
    const auth = await request(app)
      .post('/api/mobile/parent-link-auth')
      .send({ childId: parentAccessCode, parentPhone: parentPhoneInput })
      .expect(200);

    const token = auth.body.token as string;

    await request(app)
      .post('/api/mobile/parent-pin/save')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, parentPhone: parentPhoneInput, pin: '1234' })
      .expect(200);

    const wrong = await request(app)
      .post('/api/mobile/parent-pin/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, parentPhone: parentPhoneInput, pin: '9999' })
      .expect(401);

    expect(wrong.body.success).toBe(false);
  });
});
