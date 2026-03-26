// src/components/layout/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/doctor", label: "Consultations", icon: "🩺" },
  { href: "/doctor/patients", label: "My Patients", icon: "👥" },
  { href: "/doctor/tasks", label: "Tasks", icon: "✓" },
  { href: "/doctor/messages", label: "Messages", icon: "💬" },
  { href: "/doctor/reports", label: "Reports", icon: "📊" },
  { href: "/doctor/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 flex flex-col items-center py-4 gap-2 bg-white border-r border-gray-100 flex-shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm mb-4">
        MC
      </div>

      {/* Nav */}
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100 transition-colors ${pathname === item.href ? "bg-blue-50 text-blue-600" : "text-gray-500"}`}
        >
          {item.icon}
        </Link>
      ))}
    </aside>
  );
}
