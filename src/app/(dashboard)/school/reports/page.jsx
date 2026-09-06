"use client";

import { useState } from "react";
import {
  FaBook,
  FaBus,
  FaFileAlt,
  FaHome,
  FaMoneyBillWave,
  FaCalendarCheck,
} from "react-icons/fa";
import LibraryReport from "@/components/school/reports/LibraryReport";
import BusReport from "@/components/school/reports/BusReport";
import ExamsReport from "@/components/school/reports/ExamsReport";
import HomeworkReport from "@/components/school/reports/HomeworkReport";
import FeesReport from "@/components/school/reports/FeesReport";
import AttendanceReport from "@/components/school/reports/AttendanceReport";

const tabs = [
  { key: "library", label: "Library", icon: FaBook, component: LibraryReport },
  { key: "bus", label: "Bus", icon: FaBus, component: BusReport },
  { key: "exams", label: "Exams", icon: FaFileAlt, component: ExamsReport },
  { key: "homework", label: "Homework", icon: FaHome, component: HomeworkReport },
  { key: "fees", label: "Fees", icon: FaMoneyBillWave, component: FeesReport },
  { key: "attendance", label: "Attendance", icon: FaCalendarCheck, component: AttendanceReport },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("library");

  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.component;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-500">Comprehensive reports across all modules</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Report */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}