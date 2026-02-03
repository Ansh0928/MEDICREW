/**
 * In-memory store for Doctors & Patients vertical.
 * Used by API routes. In production, replace with a database.
 */

import type {
  SymptomCheck,
  QueueItem,
  DoctorNote,
  SymptomUrgencyLevel,
  PortalStatistics,
} from "@/types/doctors-patients";

let symptomChecks: SymptomCheck[] = [];
let queue: QueueItem[] = [];
let doctorNotes: DoctorNote[] = [];

// Symptom checks
export function getAllSymptomChecks(): SymptomCheck[] {
  return [...symptomChecks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getSymptomCheckById(id: string): SymptomCheck | undefined {
  return symptomChecks.find((sc) => sc.id === id);
}

export function getSymptomChecksByPatient(patientId: string): SymptomCheck[] {
  return symptomChecks
    .filter((sc) => sc.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function addSymptomCheck(
  check: Omit<SymptomCheck, "id" | "createdAt">
): SymptomCheck {
  const newCheck: SymptomCheck = {
    ...check,
    id: `sc-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  symptomChecks.push(newCheck);
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
  status: SymptomCheck["status"],
  assignedDoctor?: string
): SymptomCheck | undefined {
  const check = symptomChecks.find((sc) => sc.id === id);
  if (check) {
    check.status = status;
    if (assignedDoctor) check.assignedDoctor = assignedDoctor;
  }
  return check;
}

// Queue
const urgencyOrder: Record<SymptomUrgencyLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function getQueue(): QueueItem[] {
  return [...queue].sort(
    (a, b) => urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
  );
}

function calculateWaitTime(urgency: SymptomUrgencyLevel): number {
  const baseWaitTimes: Record<SymptomUrgencyLevel, number> = {
    critical: 0,
    high: 15,
    medium: 30,
    low: 60,
  };
  const waitingCount = queue.filter((q) => q.status === "waiting").length;
  return baseWaitTimes[urgency] + waitingCount * 10;
}

export function addToQueue(item: {
  patientId: string;
  patientName: string;
  urgencyLevel: SymptomUrgencyLevel;
  symptomCheckId: string;
}): QueueItem {
  const queueItem: QueueItem = {
    ...item,
    id: `q-${Date.now()}`,
    estimatedWaitTime: calculateWaitTime(item.urgencyLevel),
    status: "waiting",
    checkInTime: new Date().toISOString(),
  };
  queue.push(queueItem);
  return queueItem;
}

export function updateQueueStatus(
  id: string,
  status: QueueItem["status"]
): QueueItem | undefined {
  const item = queue.find((q) => q.id === id);
  if (item) item.status = status;
  return item;
}

// Doctor notes
export function getDoctorNotesBySymptomCheck(
  symptomCheckId: string
): DoctorNote[] {
  return doctorNotes
    .filter((dn) => dn.symptomCheckId === symptomCheckId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function addDoctorNote(
  note: Omit<DoctorNote, "id" | "createdAt">
): DoctorNote {
  const newNote: DoctorNote = {
    ...note,
    id: `dn-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  doctorNotes.push(newNote);
  updateSymptomCheckStatus(note.symptomCheckId, "completed");
  return newNote;
}

// Statistics
export function getStatistics(): PortalStatistics {
  const today = new Date().toDateString();
  const todayChecks = symptomChecks.filter(
    (sc) => new Date(sc.createdAt).toDateString() === today
  );
  return {
    totalChecksToday: todayChecks.length,
    pendingReviews: symptomChecks.filter((sc) => sc.status === "pending")
      .length,
    inReview: symptomChecks.filter((sc) => sc.status === "in-review").length,
    completedToday: todayChecks.filter((sc) => sc.status === "completed")
      .length,
    averageWaitTime: Math.round(
      queue.reduce((acc, q) => acc + q.estimatedWaitTime, 0) /
        (queue.length || 1)
    ),
    criticalCases: symptomChecks.filter(
      (sc) => sc.aiAssessment.urgencyLevel === "critical"
    ).length,
  };
}
