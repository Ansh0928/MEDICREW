import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    symptomJournal: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('PROF-03: Symptom journal API', () => {
  it('POST /api/patient/symptom-journal creates SymptomJournal entry', async () => {
    const now = new Date();
    vi.mocked(prisma.symptomJournal.create).mockResolvedValue({
      id: 'j1',
      patientId: 'p1',
      severity: 3,
      notes: 'mild headache',
      createdAt: now,
    } as any);

    const { POST } = await import('@/app/api/patient/symptom-journal/route');
    const req = new Request('http://localhost/api/patient/symptom-journal', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ severity: 3, notes: 'mild headache' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(prisma.symptomJournal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ patientId: 'p1', severity: 3 }),
      })
    );
  });

  it('POST /api/patient/symptom-journal validates severity is 1-5', async () => {
    const { POST } = await import('@/app/api/patient/symptom-journal/route');
    const req = new Request('http://localhost/api/patient/symptom-journal', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ severity: 10 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('GET /api/patient/symptom-journal returns journal entries for patient', async () => {
    vi.mocked(prisma.symptomJournal.findMany).mockResolvedValue([
      { id: 'j1', patientId: 'p1', severity: 2, notes: null, createdAt: new Date() },
    ] as any);

    const { GET } = await import('@/app/api/patient/symptom-journal/route');
    const req = new Request('http://localhost/api/patient/symptom-journal', {
      headers: { 'x-patient-id': 'p1' },
    });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('id', 'j1');
  });

  it('GET /api/patient/symptom-journal returns 401 without authentication', async () => {
    const { GET } = await import('@/app/api/patient/symptom-journal/route');
    const req = new Request('http://localhost/api/patient/symptom-journal');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});
