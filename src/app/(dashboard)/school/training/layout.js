"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiBook,
  FiCalendar,
  FiUserPlus,
  FiCheckSquare,
} from "react-icons/fi";

const TABS = [
  { name: "Programs", href: "/school/training/programs", icon: FiBook },
  { name: "Sessions", href: "/school/training/sessions", icon: FiCalendar },
  { name: "Enrollments", href: "/school/training/enrollments", icon: FiUserPlus },
  { name: "Attendance", href: "/school/training/attendance", icon: FiCheckSquare },
];

export default function TrainingLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-1 mb-6 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
                }
              `}
            >
              <tab.icon size={18} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}