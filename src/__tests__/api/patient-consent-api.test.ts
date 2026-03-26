import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    patientConsent: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('ONBD-02: Patient consent API', () => {
  it('POST /api/patient/consent creates PatientConsent record', async () => {
    const consentedAt = new Date();
    vi.mocked(prisma.patientConsent.create).mockResolvedValue({
      id: 'consent-1',
      patientId: 'p1',
      consentVersion: '1.0',
      dataCategories: { health: true },
      consentedAt,
      createdAt: consentedAt,
    } as any);

    const { POST } = await import('@/app/api/patient/consent/route');
    const req = new Request('http://localhost/api/patient/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ consentVersion: '1.0', dataCategories: { health: true } }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(prisma.patientConsent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ patientId: 'p1', consentVersion: '1.0' }),
      })
    );
  });

  it('POST /api/patient/consent returns 400 without required fields', async () => {
    const { POST } = await import('@/app/api/patient/consent/route');
    const req = new Request('http://localhost/api/patient/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('POST /api/patient/consent requires patient authentication', async () => {
    const { POST } = await import('@/app/api/patient/consent/route');
    const req = new Request('http://localhost/api/patient/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consentVersion: '1.0', dataCategories: { health: true } }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('POST /api/patient/consent returns 201 with consent id and consentedAt', async () => {
    const consentedAt = new Date('2026-01-01T00:00:00.000Z');
    vi.mocked(prisma.patientConsent.create).mockResolvedValue({
      id: 'consent-99',
      patientId: 'p1',
      consentVersion: '1.0',
      dataCategories: {},
      consentedAt,
      createdAt: consentedAt,
    } as any);

    const { POST } = await import('@/app/api/patient/consent/route');
    const req = new Request('http://localhost/api/patient/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ consentVersion: '1.0', dataCategories: {} }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toHaveProperty('id', 'consent-99');
    expect(body).toHaveProperty('consentedAt');
  });
});
