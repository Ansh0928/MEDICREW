import { AppShell } from "@/components/layout/AppShell";
import { HuddleRoom } from "@/components/consult/HuddleRoom";

export default function DoctorPage() {
  return (
    <AppShell activePatientId="1">
      {/* Patient header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="https://api.dicebear.com/8.x/notionists-neutral/svg?seed=Jordan&size=36"
            alt="Jordan K."
            className="w-9 h-9 rounded-full bg-gray-100"
          />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Jordan K. — Back pain</h2>
            <p className="text-xs text-gray-500">Today · Routine</p>
          </div>
        </div>
      </div>

      {/* HuddleRoom */}
      <div className="flex-1 overflow-hidden">
        <HuddleRoom
          symptoms="I'm 23 years old having back pain due to cycling. Haven't done anything about it. No medicines."
          patientInfo={{ age: "23", gender: "male" }}
        />
      </div>
    </AppShell>
  );
}
