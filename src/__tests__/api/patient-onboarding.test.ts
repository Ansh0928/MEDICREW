import { describe, it } from 'vitest';
// import { POST } from '@/app/api/patient/onboarding/route';

describe('ONBD-01: Patient onboarding API', () => {
  it.todo('POST /api/patient/onboarding saves dateOfBirth, gender, knownConditions, medications, allergies');
  it.todo('POST /api/patient/onboarding saves emergencyContact and gpDetails as JSON');
  it.todo('POST /api/patient/onboarding sets onboardingComplete to true');
  it.todo('POST /api/patient/onboarding returns 400 when required fields are missing');
  it.todo('POST /api/patient/onboarding returns 401 without x-patient-id header');
});
