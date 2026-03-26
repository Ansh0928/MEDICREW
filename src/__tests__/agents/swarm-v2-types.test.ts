import { describe, it, expect } from 'vitest';
import { RESIDENT_ROLES, createInitialSwarmState } from '@/agents/swarm-types';

describe('SwarmV2 types', () => {
  it('RESIDENT_ROLES contains exactly 4 roles', () => {
    expect(RESIDENT_ROLES).toHaveLength(4);
    expect(RESIDENT_ROLES).toContain('conservative');
    expect(RESIDENT_ROLES).toContain('pharmacological');
    expect(RESIDENT_ROLES).toContain('investigative');
    expect(RESIDENT_ROLES).toContain('red-flag');
  });

  it('createInitialSwarmState sets currentPhase to triage', () => {
    const state = createInitialSwarmState('sess-1', 'back pain', { age: '23', gender: 'male' });
    expect(state.currentPhase).toBe('triage');
    expect(state.primaryLeadRole).toBeNull();
    expect(state.pendingClarifications).toEqual([]);
  });
});
