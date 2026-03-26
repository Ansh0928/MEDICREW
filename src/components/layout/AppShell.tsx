// src/components/layout/AppShell.tsx
"use client";
import { Sidebar } from "./Sidebar";
import { SessionsColumn } from "./SessionsColumn";

interface AppShellProps {
  children: React.ReactNode;
  activePatientId?: string;
}

export function AppShell({ children, activePatientId }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <SessionsColumn activePatientId={activePatientId} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
