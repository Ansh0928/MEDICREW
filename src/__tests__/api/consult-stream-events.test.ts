import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    careTeamStatus: { upsert: vi.fn() },
    consultation: { create: vi.fn() },
  },
}));

vi.mock('@/agents/orchestrator', () => ({
  runConsultation: vi.fn(),
  streamConsultation: vi.fn(),
}));

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn() },
}));

vi.mock('@/lib/consent-check', () => ({
  checkConsent: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { checkConsent } from '@/lib/consent-check';
import { streamConsultation } from '@/agents/orchestrator';
import { inngest } from '@/lib/inngest/client';

async function* mockStream(events: object[]) {
  for (const event of events) {
    yield event;
  }
}

async function collectSSELines(res: Response): Promise<string[]> {
  const text = await res.text();
  return text.split('\n').filter((l) => l.startsWith('data:'));
}

describe('CONS-02: Consultation stream events', () => {
  it('POST /api/consult streams agent events in SSE format', async () => {
    vi.mocked(checkConsent).mockResolvedValue(true);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'p1', name: 'Test', knownConditions: null, medications: [], age: '30', gender: 'male', allergies: [] } as any);
    vi.mocked(streamConsultation).mockReturnValue(mockStream([
      { type: 'agent_message', data: { role: 'gp', agentName: 'Alex AI — GP', content: 'I see your symptoms', messages: [] } },
    ]) as any);
    vi.mocked(prisma.careTeamStatus.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.consultation.create).mockResolvedValue({ id: 'c1' } as any);
    vi.mocked(inngest.send).mockResolvedValue({} as any);

    const { POST } = await import('@/app/api/consult/route');
    const req = new Request('http://localhost/api/consult', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ symptoms: 'mild headache', stream: true }),
    });
    const res = await POST(req as any);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const lines = await collectSSELines(res);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('POST /api/consult emits agent_message events with role and content', async () => {
    vi.mocked(checkConsent).mockResolvedValue(true);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'p1', name: 'Test', knownConditions: null, medications: [], age: '30', gender: 'male', allergies: [] } as any);
    vi.mocked(streamConsultation).mockReturnValue(mockStream([
      { type: 'agent_message', data: { role: 'gp', agentName: 'Alex AI — GP', content: 'Your symptoms suggest tension headache', messages: [] } },
    ]) as any);
    vi.mocked(prisma.careTeamStatus.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.consultation.create).mockResolvedValue({ id: 'c1' } as any);
    vi.mocked(inngest.send).mockResolvedValue({} as any);

    const { POST } = await import('@/app/api/consult/route');
    const req = new Request('http://localhost/api/consult', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ symptoms: 'mild headache', stream: true }),
    });
    const res = await POST(req as any);
    const lines = await collectSSELines(res);
    const eventData = JSON.parse(lines[0].replace('data: ', ''));
    expect(eventData).toHaveProperty('type', 'agent_message');
    expect(eventData.data).toHaveProperty('role', 'gp');
    expect(eventData.data).toHaveProperty('content');
  });

  it('POST /api/consult emits final recommendation event', async () => {
    vi.mocked(checkConsent).mockResolvedValue(true);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'p1', name: 'Test', knownConditions: null, medications: [], age: '30', gender: 'male', allergies: [] } as any);
    vi.mocked(streamConsultation).mockReturnValue(mockStream([
      { type: 'recommendation', data: { urgencyLevel: 'routine', recommendation: { urgency: 'routine', summary: 'Rest', nextSteps: [], questionsForDoctor: [], timeframe: '1 week', disclaimer: '' } } },
    ]) as any);
    vi.mocked(prisma.careTeamStatus.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.consultation.create).mockResolvedValue({ id: 'c1' } as any);
    vi.mocked(inngest.send).mockResolvedValue({} as any);

    const { POST } = await import('@/app/api/consult/route');
    const req = new Request('http://localhost/api/consult', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ symptoms: 'mild headache', stream: true }),
    });
    const res = await POST(req as any);
    const lines = await collectSSELines(res);
    const recommendation = lines
      .filter((l) => !l.includes('[DONE]'))
      .map((l) => JSON.parse(l.replace('data: ', '')))
      .find((e) => e.type === 'recommendation');
    expect(recommendation).toBeDefined();
    expect(recommendation.data).toHaveProperty('recommendation');
  });

  it('POST /api/consult emits done event on completion', async () => {
    vi.mocked(checkConsent).mockResolvedValue(true);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'p1', name: 'Test', knownConditions: null, medications: [], age: '30', gender: 'male', allergies: [] } as any);
    vi.mocked(streamConsultation).mockReturnValue(mockStream([]) as any);
    vi.mocked(prisma.careTeamStatus.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.consultation.create).mockResolvedValue({ id: 'c1' } as any);
    vi.mocked(inngest.send).mockResolvedValue({} as any);

    const { POST } = await import('@/app/api/consult/route');
    const req = new Request('http://localhost/api/consult', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-patient-id': 'p1' },
      body: JSON.stringify({ symptoms: 'mild headache', stream: true }),
    });
    const res = await POST(req as any);
    const text = await res.text();
    expect(text).toContain('[DONE]');
  });
});
