import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    consultation: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedPatient: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getAuthenticatedPatient } from '@/lib/auth';

const AUTH_P1 = { patient: { id: 'p1' }, error: null };
const AUTH_NONE = {
  patient: null,
  error: new Response(JSON.stringify({ error: 'Authentication required' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  }),
};

const MOCK_CONSULTATION = {
  id: 'c1',
  symptoms: 'headache and nausea',
  urgencyLevel: 'routine',
  recommendation: {
    urgency: 'routine',
    summary: 'Rest and hydrate',
    nextSteps: ['See a GP within 1 week'],
    questionsForDoctor: ['Is this tension headache?'],
    timeframe: '1 week',
    disclaimer: 'Not medical advice',
  },
  createdAt: new Date('2026-01-01'),
};

beforeEach(() => {
  vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
});

describe('DASH-03: Consultation history API', () => {
  it('GET /api/patient/consultations returns paginated consultation list', async () => {
    vi.mocked(prisma.consultation.count).mockResolvedValue(1);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([MOCK_CONSULTATION] as any);

    const { GET } = await import('@/app/api/patient/consultations/route');
    const req = new Request('http://localhost/api/patient/consultations?page=1&limit=10');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('consultations');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page', 1);
  });

  it('GET /api/patient/consultations returns 401 without authentication', async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { GET } = await import('@/app/api/patient/consultations/route');
    const req = new Request('http://localhost/api/patient/consultations');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('GET /api/patient/consultations filters by patient id', async () => {
    vi.mocked(prisma.consultation.count).mockResolvedValue(1);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([MOCK_CONSULTATION] as any);

    const { GET } = await import('@/app/api/patient/consultations/route');
    const req = new Request('http://localhost/api/patient/consultations');
    await GET(req as any);
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'p1' } })
    );
  });

  it('GET /api/patient/consultations returns consultation with structured recommendation', async () => {
    vi.mocked(prisma.consultation.count).mockResolvedValue(1);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([MOCK_CONSULTATION] as any);

    const { GET } = await import('@/app/api/patient/consultations/route');
    const req = new Request('http://localhost/api/patient/consultations');
    const res = await GET(req as any);
    const body = await res.json();
    const first = body.consultations[0];
    expect(first.recommendation).toHaveProperty('nextSteps');
    expect(first.recommendation).toHaveProperty('urgency');
  });
});
