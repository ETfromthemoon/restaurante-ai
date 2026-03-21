import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('POST /api/auth/login', () => {
  it('credenciales válidas → 200 + token, sin campo password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mesero@restaurante.com', password: '1234' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('mesero@restaurante.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('password incorrecto → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mesero@restaurante.com', password: 'wrong_password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('email con formato inválido → 400 (Zod)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noesuncorreo', password: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('sin password → 400 (Zod)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mesero@restaurante.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
