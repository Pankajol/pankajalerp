"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaHome,
  FaBook,
  FaCalendarAlt,
  FaGraduationCap,
} from "react-icons/fa";

const tabs = [
  { name: "Houses", path: "/school/academics/houses", icon: FaHome },
  { name: "Timetable", path: "/school/academics/timetable", icon: FaCalendarAlt },
  { name: "Lesson Plans", path: "/school/academics/lesson-plans", icon: FaBook },
];

export default function AcademicsLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md">
              <FaGraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Academics
              </h1>
              <p className="text-gray-500 mt-1">
                Manage houses, timetables, and lesson plans
              </p>
            </div>
          </div>
          {/* Optional global action – can be extended per tab */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const activeTab = tabs.find(tab => pathname === tab.path || pathname.startsWith(tab.path + "/"));
                if (activeTab) {
                  router.push(`${activeTab.path}/create`);
                } else {
                  router.push("/school/academics/houses/create");
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:shadow-xl hover:bg-indigo-700 transition font-medium"
            >
              <span>+ Create New</span>
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 mb-8">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.path || pathname.startsWith(tab.path + "/");
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.path}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(tab.path)}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium transition-all
                    ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.name}
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Child Page Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}