import type { SymptomCheck, QueueItem, DoctorNote } from '@/types';

// In-memory storage for demo
// In production, this would be a database

let symptomChecks: SymptomCheck[] = [
  {
    id: 'sc-001',
    patientId: 'pat-001',
    patientName: 'John Smith',
    symptoms: ['Headache', 'Fever', 'Fatigue'],
    duration: '3 days',
    additionalInfo: 'Headache is worse in the morning, fever comes and goes',
    aiAssessment: {
      urgencyLevel: 'medium',
      possibleConditions: ['Viral infection', 'Influenza', 'Sinusitis', 'Tension headache'],
      recommendedAction: 'Book a routine appointment with your GP within the next few days. Rest and monitor symptoms.',
      questionsToAsk: [
        'How long have you had these symptoms?',
        'Have you tried any treatments?',
        'Do you have any allergies?',
        'Is this the first time you\'ve experienced this?',
      ],
      confidence: 82,
      reasoning: 'The reported symptoms (Headache, Fever, Fatigue) over 3 days suggest Viral infection or similar conditions. These are typically manageable but should be evaluated by a healthcare provider to rule out more serious causes.',
    },
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    assignedDoctor: 'doc-001',
  },
  {
    id: 'sc-002',
    patientId: 'pat-002',
    patientName: 'Emma Wilson',
    symptoms: ['Chest pain', 'Shortness of breath'],
    duration: '2 hours',
    additionalInfo: 'Chest pain started suddenly while exercising, feels like pressure',
    aiAssessment: {
      urgencyLevel: 'critical',
      possibleConditions: ['Angina', 'Myocardial infarction', 'Costochondritis', 'Gastroesophageal reflux'],
      recommendedAction: 'Seek emergency medical attention immediately. Call 000 or go to the nearest emergency department.',
      questionsToAsk: [
        'Are you experiencing severe chest pain or pressure?',
        'Is the pain radiating to your arm, jaw, or back?',
        'Are you having difficulty breathing?',
        'Do you feel faint or dizzy?',
      ],
      confidence: 91,
      reasoning: 'Based on the reported symptoms (Chest pain, Shortness of breath) and duration of 2 hours, the AI has identified potentially serious conditions requiring immediate attention. The combination of symptoms suggests Angina or related cardiovascular/respiratory issues.',
    },
    status: 'in-review',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    assignedDoctor: 'doc-001',
  },
  {
    id: 'sc-003',
    patientId: 'pat-003',
    patientName: 'Michael Brown',
    symptoms: ['Back pain', 'Joint pain'],
    duration: '1 week',
    additionalInfo: 'Pain is worse after sitting for long periods, improves with movement',
    aiAssessment: {
      urgencyLevel: 'low',
      possibleConditions: ['Muscle strain', 'Herniated disc', 'Sciatica', 'Osteoarthritis'],
      recommendedAction: 'Self-care at home is appropriate. Rest, stay hydrated, and monitor symptoms. See a doctor if symptoms worsen.',
      questionsToAsk: [
        'Can you describe the symptoms in more detail?',
        'Have you noticed any triggers?',
        'Is there anything that makes it better or worse?',
        'Do you have any other symptoms?',
      ],
      confidence: 78,
      reasoning: 'The symptoms (Back pain, Joint pain) appear consistent with common, self-limiting conditions such as Muscle strain. Based on the duration of 1 week and symptom profile, home care with monitoring is appropriate.',
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

let queue: QueueItem[] = [
  {
    id: 'q-001',
    patientId: 'pat-002',
    patientName: 'Emma Wilson',
    urgencyLevel: 'critical',
    estimatedWaitTime: 0,
    status: 'in-progress',
    symptomCheckId: 'sc-002',
    checkInTime: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'q-002',
    patientId: 'pat-003',
    patientName: 'Michael Brown',
    urgencyLevel: 'low',
    estimatedWaitTime: 45,
    status: 'waiting',
    symptomCheckId: 'sc-003',
    checkInTime: new Date(Date.now() - 3600000).toISOString(),
  },
];

let doctorNotes: DoctorNote[] = [
  {
    id: 'dn-001',
    symptomCheckId: 'sc-001',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Chen',
    diagnosis: 'Viral upper respiratory infection',
    treatment: 'Rest, fluids, acetaminophen for fever and headache. Monitor symptoms.',
    notes: 'Patient presents with typical viral symptoms. No red flags identified. Recommend follow-up if symptoms persist beyond 7 days.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Symptom Check operations
export function getAllSymptomChecks(): SymptomCheck[] {
  return [...symptomChecks].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getSymptomCheckById(id: string): SymptomCheck | undefined {
  return symptomChecks.find(sc => sc.id === id);
}

export function getSymptomChecksByPatient(patientId: string): SymptomCheck[] {
  return symptomChecks
    .filter(sc => sc.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addSymptomCheck(check: Omit<SymptomCheck, 'id' | 'createdAt'>): SymptomCheck {
  const newCheck: SymptomCheck = {
    ...check,
    id: `sc-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  symptomChecks.push(newCheck);
  
  // Add to queue
  addToQueue({
    patientId: check.patientId,
    patientName: check.patientName,
    urgencyLevel: check.aiAssessment.urgencyLevel,
    symptomCheckId: newCheck.id,
  });
  
  return newCheck;
}

export function updateSymptomCheckStatus(
  id: string, 
  status: SymptomCheck['status'],
  assignedDoctor?: string
): SymptomCheck | undefined {
  const check = symptomChecks.find(sc => sc.id === id);
  if (check) {
    check.status = status;
    if (assignedDoctor) {
      check.assignedDoctor = assignedDoctor;
    }
  }
  return check;
}

// Queue operations
export function getQueue(): QueueItem[] {
  return [...queue].sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
  });
}

export function addToQueue(item: {
  patientId: string;
  patientName: string;
  urgencyLevel: QueueItem['urgencyLevel'];
  symptomCheckId: string;
}): QueueItem {
  const queueItem: QueueItem = {
    ...item,
    id: `q-${Date.now()}`,
    estimatedWaitTime: calculateWaitTime(item.urgencyLevel),
    status: 'waiting',
    checkInTime: new Date().toISOString(),
  };
  queue.push(queueItem);
  return queueItem;
}

export function updateQueueStatus(
  id: string, 
  status: QueueItem['status']
): QueueItem | undefined {
  const item = queue.find(q => q.id === id);
  if (item) {
    item.status = status;
  }
  return item;
}

export function removeFromQueue(id: string): void {
  queue = queue.filter(q => q.id !== id);
}

function calculateWaitTime(urgency: QueueItem['urgencyLevel']): number {
  const baseWaitTimes = { critical: 0, high: 15, medium: 30, low: 60 };
  const waitingCount = queue.filter(q => q.status === 'waiting').length;
  return baseWaitTimes[urgency] + waitingCount * 10;
}

// Doctor Notes operations
export function getDoctorNotesBySymptomCheck(symptomCheckId: string): DoctorNote[] {
  return doctorNotes
    .filter(dn => dn.symptomCheckId === symptomCheckId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addDoctorNote(note: Omit<DoctorNote, 'id' | 'createdAt'>): DoctorNote {
  const newNote: DoctorNote = {
    ...note,
    id: `dn-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  doctorNotes.push(newNote);
  
  // Update symptom check status
  updateSymptomCheckStatus(note.symptomCheckId, 'completed');
  
  return newNote;
}

// Statistics
export function getStatistics() {
  const today = new Date().toDateString();
  const todayChecks = symptomChecks.filter(sc => 
    new Date(sc.createdAt).toDateString() === today
  );
  
  return {
    totalChecksToday: todayChecks.length,
    pendingReviews: symptomChecks.filter(sc => sc.status === 'pending').length,
    inReview: symptomChecks.filter(sc => sc.status === 'in-review').length,
    completedToday: todayChecks.filter(sc => sc.status === 'completed').length,
    averageWaitTime: Math.round(queue.reduce((acc, q) => acc + q.estimatedWaitTime, 0) / (queue.length || 1)),
    criticalCases: symptomChecks.filter(sc => sc.aiAssessment.urgencyLevel === 'critical').length,
  };
}
