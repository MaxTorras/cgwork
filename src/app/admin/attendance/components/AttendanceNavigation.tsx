"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AttendanceNavigation() {
  const pathname = usePathname();

  const links = [
    { name: "Record Attendance", href: "/admin/attendance" },
    { name: "Manage People", href: "/admin/attendance/people" },
    { name: "Manage Groups", href: "/admin/attendance/groups" },
    { name: "Attendance History", href: "/admin/attendance/history" },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-6 py-4">
        {links.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}