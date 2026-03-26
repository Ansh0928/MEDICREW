// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { computeAgentPositions } from '@/components/consult/HuddleRoom';

describe('computeAgentPositions', () => {
  it('places primary lead at centre (0,0)', () => {
    const positions = computeAgentPositions(['physiotherapy'], ['physiotherapy', 'gp', 'conservative', 'pharmacological', 'investigative', 'red-flag'], 160);
    expect(positions['physiotherapy']).toEqual({ x: 0, y: 0, isCenter: true });
  });

  it('places outer agents at the given radius', () => {
    const outer = ['gp', 'conservative', 'pharmacological'];
    const positions = computeAgentPositions(['physiotherapy'], ['physiotherapy', ...outer], 160);
    for (const role of outer) {
      const pos = positions[role];
      const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
      expect(dist).toBeCloseTo(160, 0);
    }
  });

  it('scales radius to 200 when >10 outer agents', () => {
    const outer = Array.from({ length: 11 }, (_, i) => `agent-${i}`);
    const positions = computeAgentPositions(['lead'], ['lead', ...outer], 160);
    const pos = positions['agent-0'];
    const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
    expect(dist).toBeCloseTo(200, 0);
  });
});
