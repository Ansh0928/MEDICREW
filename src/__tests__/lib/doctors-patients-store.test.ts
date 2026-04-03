// Tests: doctors-patients-store in-memory store
import { describe, it, expect, beforeEach, vi } from "vitest";

// Reset module between tests to get fresh in-memory state
beforeEach(() => vi.resetModules());

function makeAiAssessment(
  urgencyLevel: "low" | "medium" | "high" | "critical" = "low",
) {
  return {
    urgencyLevel,
    possibleConditions: ["test"],
    recommendedAction: "rest",
    questionsToAsk: [],
    confidence: 0.8,
    reasoning: "test reasoning",
  };
}

describe("doctors-patients-store", () => {
  it("starts empty — getAllSymptomChecks returns []", async () => {
    const { getAllSymptomChecks } =
      await import("@/lib/doctors-patients-store");
    expect(getAllSymptomChecks()).toEqual([]);
  });

  it("addSymptomCheck persists and returns check with id/createdAt", async () => {
    const { addSymptomCheck, getAllSymptomChecks } =
      await import("@/lib/doctors-patients-store");
    const check = addSymptomCheck({
      patientId: "p1",
      patientName: "Alice",
      symptoms: ["headache"],
      duration: "2 days",
      additionalInfo: "",
      aiAssessment: makeAiAssessment("low"),
      status: "pending",
    });
    expect(check.id).toMatch(/^sc-/);
    expect(check.createdAt).toBeTruthy();
    expect(getAllSymptomChecks()).toHaveLength(1);
  });

  it("getSymptomCheckById returns correct check", async () => {
    const { addSymptomCheck, getSymptomCheckById } =
      await import("@/lib/doctors-patients-store");
    const check = addSymptomCheck({
      patientId: "p1",
      patientName: "Alice",
      symptoms: ["nausea"],
      duration: "1 day",
      additionalInfo: "",
      aiAssessment: makeAiAssessment("medium"),
      status: "pending",
    });
    expect(getSymptomCheckById(check.id)).toEqual(check);
    expect(getSymptomCheckById("nonexistent")).toBeUndefined();
  });

  it("getSymptomChecksByPatient filters by patientId", async () => {
    const { addSymptomCheck, getSymptomChecksByPatient } =
      await import("@/lib/doctors-patients-store");
    addSymptomCheck({
      patientId: "p1",
      patientName: "Alice",
      symptoms: ["cough"],
      duration: "3 days",
      additionalInfo: "",
      aiAssessment: makeAiAssessment(),
      status: "pending",
    });
    addSymptomCheck({
      patientId: "p2",
      patientName: "Bob",
      symptoms: ["fever"],
      duration: "1 day",
      additionalInfo: "",
      aiAssessment: makeAiAssessment(),
      status: "pending",
    });
    expect(getSymptomChecksByPatient("p1")).toHaveLength(1);
    expect(getSymptomChecksByPatient("p2")).toHaveLength(1);
    expect(getSymptomChecksByPatient("p1")[0].patientName).toBe("Alice");
  });

  it("updateSymptomCheckStatus changes status and returns check", async () => {
    const { addSymptomCheck, updateSymptomCheckStatus } =
      await import("@/lib/doctors-patients-store");
    const check = addSymptomCheck({
      patientId: "p1",
      patientName: "Alice",
      symptoms: ["fatigue"],
      duration: "1 week",
      additionalInfo: "",
      aiAssessment: makeAiAssessment(),
      status: "pending",
    });
    const updated = updateSymptomCheckStatus(check.id, "in-review", "Dr Smith");
    expect(updated?.status).toBe("in-review");
    expect(updated?.assignedDoctor).toBe("Dr Smith");
  });

  it("getQueue sorts by urgency (critical before low)", async () => {
    const { addSymptomCheck, getQueue } =
      await import("@/lib/doctors-patients-store");
    addSymptomCheck({
      patientId: "p1",
      patientName: "Alice",
      symptoms: ["mild"],
      duration: "1 day",
      additionalInfo: "",
      aiAssessment: makeAiAssessment("low"),
      status: "pending",
    });
    addSymptomCheck({
      patientId: "p2",
      patientName: "Bob",
      symptoms: ["severe"],
      duration: "1 day",
      additionalInfo: "",
      aiAssessment: makeAiAssessment("critical"),
      status: "pending",
    });
    const q = getQueue();
    expect(q[0].urgencyLevel).toBe("critical");
    expect(q[q.length - 1].urgencyLevel).toBe("low");
  });

  it("addDoctorNote persists and marks check as completed", async () => {
    const {
      addSymptomCheck,
      addDoctorNote,
      getDoctorNotesBySymptomCheck,
      getSymptomCheckById,
    } = await import("@/lib/doctors-patients-store");
    const check = addSymptomCheck({
      patientId: "p1",
      patientName: "Alice",
      symptoms: ["pain"],
      duration: "1 day",
      additionalInfo: "",
      aiAssessment: makeAiAssessment(),
      status: "pending",
    });
    const note = addDoctorNote({
      symptomCheckId: check.id,
      doctorId: "d1",
      doctorName: "Dr Jones",
      diagnosis: "tension headache",
      treatment: "paracetamol",
      notes: "",
    });
    expect(note.id).toMatch(/^dn-/);
    expect(getDoctorNotesBySymptomCheck(check.id)).toHaveLength(1);
    expect(getSymptomCheckById(check.id)?.status).toBe("completed");
  });

  it("getStatistics reflects current store state", async () => {
    const { addSymptomCheck, getStatistics } =
      await import("@/lib/doctors-patients-store");
    addSymptomCheck({
      patientId: "p1",
      patientName: "Alice",
      symptoms: ["cough"],
      duration: "1 day",
      additionalInfo: "",
      aiAssessment: makeAiAssessment("critical"),
      status: "pending",
    });
    const stats = getStatistics();
    expect(stats.totalChecksToday).toBe(1);
    expect(stats.pendingReviews).toBe(1);
    expect(stats.criticalCases).toBe(1);
  });
});
