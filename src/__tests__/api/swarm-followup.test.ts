import { describe, it, expect } from 'vitest';

describe('POST /api/swarm/followup input validation', () => {
  it('rejects missing question', async () => {
    const { POST } = await import('@/app/api/swarm/followup/route');
    const req = new Request('http://localhost/api/swarm/followup', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'abc' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/question/);
  });

  it('rejects missing sessionId', async () => {
    const { POST } = await import('@/app/api/swarm/followup/route');
    const req = new Request('http://localhost/api/swarm/followup', {
      method: 'POST',
      body: JSON.stringify({ question: 'how long should I rest?' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
