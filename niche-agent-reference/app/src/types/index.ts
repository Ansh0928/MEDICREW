export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'doctor';
  avatar?: string;
}

export interface Symptom {
  id: string;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SymptomCheck {
  id: string;
  patientId: string;
  patientName: string;
  symptoms: string[];
  duration: string;
  additionalInfo: string;
  aiAssessment: AIAssessment;
  status: 'pending' | 'in-review' | 'completed';
  createdAt: string;
  assignedDoctor?: string;
}

export interface AIAssessment {
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  possibleConditions: string[];
  recommendedAction: string;
  questionsToAsk: string[];
  confidence: number;
  reasoning: string;
}

export interface DoctorNote {
  id: string;
  symptomCheckId: string;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedWaitTime: number;
  status: 'waiting' | 'in-progress' | 'completed';
  symptomCheckId: string;
  checkInTime: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  emergencyContact: string;
  medicalHistory: string[];
  allergies: string[];
  medications: string[];
}

export interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  hospital: string;
  availability: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
}
