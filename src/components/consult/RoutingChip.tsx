// src/components/consult/RoutingChip.tsx
"use client";

export function RoutingChip({ questionType, activatedRoles }: { questionType: "simple" | "complex"; activatedRoles: string[] }) {
  if (questionType === "simple") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        Routing to lead specialist directly
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
      Re-activating: {activatedRoles.join(", ")} residents
    </span>
  );
}
