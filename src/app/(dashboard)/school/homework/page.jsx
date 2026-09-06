"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaPlus,
  FaEye,
  FaTrash,
  FaSearch,
  FaBook,
  FaUserTie,
  FaCalendarAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function HomeworkPage() {
  const router = useRouter();
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [students, setStudents] = useState([]);
  const [roleInfo, setRoleInfo] = useState({ isTeacher: true, isStudent: false, isParent: false });
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      const roles = (decoded.roles || []).map((role) => role.toLowerCase());
      const isStudent = decoded.type === "student" || roles.includes("student");
      const isParent = decoded.type === "parent" || roles.includes("parent");
      const isTeacher =
        decoded.type === "company" ||
        roles.some((role) => ["admin", "school admin", "principal", "teacher"].includes(role));
      setRoleInfo({ isTeacher, isStudent, isParent });
    } catch {
      setRoleInfo({ isTeacher: true, isStudent: false, isParent: false });
    }
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/students", { params: { limit: 1000, isActive: true }, ...headers });
        const studentList = res.data.data || [];
        setStudents(studentList);
        const savedStudent = localStorage.getItem("schoolSelectedStudentId");
        if (savedStudent && studentList.some((student) => student._id === savedStudent)) {
          setStudentFilter(savedStudent);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStudents();
  }, []);

  const fetchHomework = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 10, search };
      if (classFilter) params.class = classFilter;
      if (subjectFilter) params.subject = subjectFilter;
      if (studentFilter) params.student = studentFilter;

      const res = await api.get("/school/homework", { params, ...headers });
      setHomeworks(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load homework");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, classFilter, subjectFilter, studentFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this homework?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/homework/${id}`, headers);
      toast.success("Homework deleted");
      fetchHomework(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const selectedStudent = students.find((student) => student._id === studentFilter);

  // Unique subjects for filter
  const uniqueSubjects = [...new Set(homeworks.map((h) => h.subject).filter(Boolean))];

  return (
    <div>
      {/* Header with Count */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBook className="text-indigo-500" size={24} />
            Homework
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {meta.total} {meta.total === 1 ? "assignment" : "assignments"} total
          </p>
        </div>
        {roleInfo.isTeacher && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/school/homework/create")}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
          >
            <FaPlus /> New Homework
          </motion.button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
        >
          <option value="">All Classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>

        {(roleInfo.isStudent || roleInfo.isParent) && (
          <select
            value={studentFilter}
            onChange={(e) => {
              setStudentFilter(e.target.value);
              if (e.target.value) localStorage.setItem("schoolSelectedStudentId", e.target.value);
              else localStorage.removeItem("schoolSelectedStudentId");
            }}
            className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
          >
            <option value="">All Students</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.firstName} {student.lastName || ""} - Class {student.class}
              </option>
            ))}
          </select>
        )}

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
        >
          <option value="">All Subjects</option>
          {uniqueSubjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={() => fetchHomework(1)}
          className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition font-medium"
        >
          Apply Filters
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Title</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Class</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Teacher</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Due Date</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Submissions</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-indigo-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : homeworks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <FaBook size={32} className="text-indigo-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">No homework found</h3>
                      <p className="text-gray-400 mt-1">
                        {search || classFilter || subjectFilter
                          ? "Try adjusting your filters"
                          : "Create your first homework assignment"}
                      </p>
                      {!search && !classFilter && !subjectFilter && roleInfo.isTeacher && (
                        <button
                          onClick={() => router.push("/school/homework/create")}
                          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
                        >
                          New Homework
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                homeworks.map((hw, idx) => (
                  <motion.tr
                    key={hw._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50 transition group"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">{hw.title}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        <FaBook size={10} />
                        Class {hw.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{hw.subject}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {hw.teacher ? (
                        <span className="flex items-center gap-1">
                          <FaUserTie size={12} className="text-gray-400" />
                          {hw.teacher.firstName} {hw.teacher.lastName}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt size={12} className="text-gray-400" />
                        {new Date(hw.dueDate).toLocaleDateString("en-GB")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-indigo-700">
                      {hw.submissions?.length || 0}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          if (selectedStudent?._id) localStorage.setItem("schoolSelectedStudentId", selectedStudent._id);
                          router.push(`/school/homework/${hw._id}`);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="View homework"
                      >
                        <FaEye size={15} />
                      </button>
                      {roleInfo.isTeacher && (
                        <button
                          onClick={() => handleDelete(hw._id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete homework"
                        >
                          <FaTrash size={15} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Page {meta.page} of {meta.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchHomework(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => fetchHomework(meta.page + 1)}
                disabled={meta.page >= meta.pages}
                className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
