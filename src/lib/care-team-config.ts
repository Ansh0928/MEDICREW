export const CARE_TEAM = [
  {
    role: 'gp',
    name: 'Alex AI \u2014 GP',
    emoji: '\uD83D\uDC68\u200D\u2695\uFE0F',
    specialty: 'General Practice',
    bio: "I'm here to help with your overall health and coordinate your care.",
  },
  {
    role: 'cardiology',
    name: 'Sarah AI \u2014 Cardiology',
    emoji: '\u2764\uFE0F',
    specialty: 'Cardiology',
    bio: 'I specialise in heart health and cardiovascular concerns.',
  },
  {
    role: 'mental_health',
    name: 'Maya AI \u2014 Mental Health',
    emoji: '\uD83E\uDDE0',
    specialty: 'Mental Health',
    bio: "I'm here to support your mental wellbeing and emotional health.",
  },
  {
    role: 'dermatology',
    name: 'Priya AI \u2014 Dermatology',
    emoji: '\uD83C\uDF3F',
    specialty: 'Dermatology',
    bio: 'I focus on skin health, rashes, and dermatological concerns.',
  },
  {
    role: 'orthopedic',
    name: 'James AI \u2014 Orthopedic',
    emoji: '\uD83E\uDDB4',
    specialty: 'Orthopedics',
    bio: 'I help with joint, bone, and musculoskeletal issues.',
  },
  {
    role: 'gastro',
    name: 'Chen AI \u2014 Gastroenterology',
    emoji: '\uD83E\uDEC3',
    specialty: 'Gastroenterology',
    bio: 'I specialise in digestive health and gastrointestinal concerns.',
  },
  {
    role: 'physiotherapy',
    name: 'Emma AI \u2014 Physiotherapy',
    emoji: '\uD83C\uDFC3',
    specialty: 'Physiotherapy',
    bio: 'I help with movement, rehabilitation, and physical recovery.',
  },
  {
    role: 'triage',
    name: 'Triage AI',
    emoji: '\uD83D\uDEA6',
    specialty: 'Triage',
    bio: 'I assess your symptoms and route you to the right specialist.',
  },
] as const;

export type CareTeamMember = (typeof CARE_TEAM)[number];
export type CareTeamRole = CareTeamMember['role'];
