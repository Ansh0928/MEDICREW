import { describe, it } from 'vitest';
// import { POST } from '@/app/api/consult/route';

describe('CONS-01: Consultation stream identity', () => {
  it.todo('POST /api/consult requires x-patient-id header');
  it.todo('POST /api/consult returns 401 without patient identification');
});

describe('CONS-03: Consultation stream onboarding gate', () => {
  it.todo('POST /api/consult returns 403 when patient has not completed onboarding');
  it.todo('POST /api/consult proceeds when onboardingComplete is true');
});
