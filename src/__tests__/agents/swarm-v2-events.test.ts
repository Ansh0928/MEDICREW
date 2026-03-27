// src/__tests__/agents/swarm-v2-events.test.ts
import { describe, it, expect } from 'vitest';
import { selectPrimaryLead, buildResidentPrompt } from '@/agents/swarm';

describe('selectPrimaryLead', () => {
  it('returns the lead with highest average resident confidence', () => {
    const leadSwarms = {
      physiotherapy: {
        status: 'complete' as const,
        hypotheses: [
          { id: '1', name: 'h1', confidence: 80, reasoning: '', residentRole: 'conservative' as const },
          { id: '2', name: 'h2', confidence: 60, reasoning: '', residentRole: 'pharmacological' as const },
        ],
        residentDebate: [],
        rectification: { doctorRole: 'physiotherapy' as const, summary: 'test' },
      },
      gp: {
        status: 'complete' as const,
        hypotheses: [
          { id: '3', name: 'h3', confidence: 50, reasoning: '', residentRole: 'conservative' as const },
        ],
        residentDebate: [],
        rectification: { doctorRole: 'gp' as const, summary: 'test' },
      },
    };
    expect(selectPrimaryLead(leadSwarms)).toBe('physiotherapy');
  });

  it('returns first key if all confidences equal', () => {
    const leadSwarms = {
      gp: {
        status: 'complete' as const,
        hypotheses: [{ id: '1', name: 'h1', confidence: 50, reasoning: '', residentRole: 'conservative' as const }],
        residentDebate: [],
        rectification: { doctorRole: 'gp' as const, summary: '' },
      },
    };
    expect(selectPrimaryLead(leadSwarms)).toBe('gp');
  });
});

describe('buildResidentPrompt', () => {
  it('injects specialty context into resident system prompt', () => {
    const prompt = buildResidentPrompt('conservative', 'physiotherapy', 'back pain', { age: '23', gender: 'male' });
    expect(prompt).toContain('physiotherapy');
    expect(prompt).toContain('back pain');
    expect(prompt).toContain('23');
  });

  it('includes medications and allergies when present', () => {
    const prompt = buildResidentPrompt(
      'investigative',
      'gp',
      'dizziness',
      { age: '40', gender: 'female', medications: ['metformin'], allergies: ['penicillin'] }
    );
    expect(prompt).toContain('medications: metformin');
    expect(prompt).toContain('allergies: penicillin');
  });
});
