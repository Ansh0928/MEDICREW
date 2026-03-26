import { describe, it } from 'vitest';
// import { CARE_TEAM } from '@/lib/care-team-config';

describe('ONBD-03: Care team config', () => {
  it.todo('CARE_TEAM contains all 8 agents including triage');
  it.todo('CARE_TEAM uses em dash in agent names (Alex AI \u2014 GP)');
  it.todo('CARE_TEAM does not import from agentRegistry or LangChain');
  it.todo('CareTeamIntroStep excludes triage agent from display');
});
