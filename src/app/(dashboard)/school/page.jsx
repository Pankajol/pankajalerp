"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaUsers, FaChalkboardTeacher, FaCalendarCheck, FaMoneyBillWave,
  FaBook, FaClock, FaExclamationTriangle, FaSchool,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function SchoolDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    attendance: 0,
    fees: 0,
    exams: 0,
    homework: 0,
  });
  const [loading, setLoading] = useState(true);
  const [portalRole, setPortalRole] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        let role = "";
        if (token) {
          try {
            const decoded = jwtDecode(token);
            role = decoded.type === "school" ? (decoded.schoolRole || decoded.role || "").toLowerCase() : "";
            setPortalRole(role);
          } catch {}
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [students, staff, attendance, fees, exams, homework] = await Promise.all([
          api.get("/school/students", headers),
          api.get("/school/staff", headers),
          api.get("/school/attendance?date=" + new Date().toISOString().split("T")[0], headers),
          api.get("/school/fees?status=pending", headers),
          api.get("/school/exams?status=published", headers),
          api.get("/school/homework?today=true", headers),
        ]);
        setStats({
          students: students.data.data?.length || 0,
          staff: staff.data.data?.length || 0,
          attendance: attendance.data.data?.length || 0,
          fees: fees.data.data?.length || 0,
          exams: exams.data.data?.length || 0,
          homework: homework.data.data?.length || 0,
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const isStudentOrParent = ["student", "parent"].includes(portalRole);
  const cards = [
    { label: "Students", value: stats.students, icon: FaUsers, color: "bg-blue-500", path: "/school/students" },
    !isStudentOrParent && { label: "Staff", value: stats.staff, icon: FaChalkboardTeacher, color: "bg-green-500", path: "/school/staff" },
    { label: "Today's Attendance", value: stats.attendance, icon: FaCalendarCheck, color: "bg-amber-500", path: "/school/attendance" },
    { label: "Pending Fees", value: stats.fees, icon: FaMoneyBillWave, color: "bg-red-500", path: "/school/fees" },
    { label: "Published Exams", value: stats.exams, icon: FaBook, color: "bg-purple-500", path: "/school/exams" },
    { label: "Today's Homework", value: stats.homework, icon: FaClock, color: "bg-indigo-500", path: "/school/homework" },
  ].filter(Boolean);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading dashboard...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <FaSchool className="text-3xl text-indigo-600" />
        <h1 className="text-2xl font-extrabold text-gray-900">School Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <div
            key={idx}
            onClick={() => router.push(card.path)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.color} text-white`}>
                <card.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {!portalRole && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push("/school/students/create")}
            className="p-4 bg-indigo-50 rounded-xl text-indigo-700 font-bold hover:bg-indigo-100 transition"
          >
            + Add Student
          </button>
          <button
            onClick={() => router.push("/school/staff/create")}
            className="p-4 bg-green-50 rounded-xl text-green-700 font-bold hover:bg-green-100 transition"
          >
            + Add Staff
          </button>
          <button
            onClick={() => router.push("/school/attendance")}
            className="p-4 bg-amber-50 rounded-xl text-amber-700 font-bold hover:bg-amber-100 transition"
          >
            Mark Attendance
          </button>
          <button
            onClick={() => router.push("/school/fees/collection")}
            className="p-4 bg-red-50 rounded-xl text-red-700 font-bold hover:bg-red-100 transition"
          >
            Collect Fee
          </button>
        </div>
      )}
    </div>
  );
}
