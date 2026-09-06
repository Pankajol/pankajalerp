"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaBook,
  FaUserTie,
  FaCalendarAlt,
  FaAlignLeft,
  FaCheckCircle,
  FaClock,
  FaGraduationCap,
  FaPlus,
  FaEdit,
  FaUser,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function HomeworkDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [homework, setHomework] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // ─── Decode user and set initial student ID ──────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);

      // For students, set their own ID immediately
      if (decoded.type === "student") {
        const ownId = decoded.studentId || decoded.id || decoded.userId;
        if (ownId) {
          setSelectedStudentId(ownId);
          localStorage.setItem("schoolSelectedStudentId", ownId);
        }
      } else if (decoded.type === "parent") {
        // Parents: load saved selection or default to first child later
        const saved = localStorage.getItem("schoolSelectedStudentId") || "";
        setSelectedStudentId(saved);
      }
    } catch (err) {
      console.error("JWT decode error", err);
    }
  }, []);

  // ─── For parents: fetch student list ──────────────────────
  useEffect(() => {
    if (!user) return;
    const roles = (user.roles || []).map((r) => r.toLowerCase());
    const isParent = user.type === "parent" || roles.includes("parent");
    if (!isParent) return;

    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/students", {
          params: { limit: 1000, isActive: true },
          ...headers,
        });
        const list = res.data.data || [];
        setStudents(list);
        // If no selection yet, pick the first student
        if (!selectedStudentId && list.length) {
          const firstId = list[0]._id;
          setSelectedStudentId(firstId);
          localStorage.setItem("schoolSelectedStudentId", firstId);
        }
      } catch (err) {
        console.error("Failed to fetch students", err);
      }
    };
    fetchStudents();
  }, [user, selectedStudentId]);

  // ─── Fetch homework ────────────────────────────────────────
  useEffect(() => {
    const fetchHomework = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/homework/${id}`, headers);
        setHomework(res.data.data);
      } catch (err) {
        toast.error("Failed to load homework");
        router.push("/school/homework");
      } finally {
        setLoading(false);
      }
    };
    fetchHomework();
  }, [id, router]);

  // ─── Role detection ────────────────────────────────────────
  const roles = (user?.roles || []).map((r) => r.toLowerCase());
  const isStudent = user?.type === "student" || roles.includes("student");
  const isParent = user?.type === "parent" || roles.includes("parent");
  const isTeacher =
    user?.type === "company" ||
    roles.some((r) => ["admin", "school admin", "principal", "teacher"].includes(r));

  // ─── Resolve current student ID (critical!) ──────────────
  // For students: use their own ID from the token
  // For parents: use the selected dropdown value
  const currentStudentId = isStudent
    ? user?.studentId || user?.id || user?.userId
    : selectedStudentId;

  // ─── Check submission status ──────────────────────────────
  const getStudentIdFromSubmission = (sub) => {
    if (!sub) return null;
    if (typeof sub.student === "object" && sub.student._id) return sub.student._id;
    if (typeof sub.student === "string") return sub.student;
    return null;
  };

  const hasSubmitted = homework?.submissions?.some(
    (sub) => getStudentIdFromSubmission(sub) === currentStudentId
  );

  const mySubmission = homework?.submissions?.find(
    (sub) => getStudentIdFromSubmission(sub) === currentStudentId
  );

  // ─── Handle parent selection change ───────────────────────
  const handleStudentChange = (e) => {
    const id = e.target.value;
    setSelectedStudentId(id);
    localStorage.setItem("schoolSelectedStudentId", id);
  };

  // ─── Debug logs (remove after testing) ─────────────────────
  // console.log("currentStudentId:", currentStudentId);
  // console.log("hasSubmitted:", hasSubmitted);
  // console.log("mySubmission:", mySubmission);

  // ─── Loading & error states ──────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading homework details...</p>
      </div>
    );
  }

  if (!homework) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaBook size={40} className="text-red-300" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700">Homework not found</h3>
        <button
          onClick={() => router.push("/school/homework")}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition"
        >
          Back to Homework
        </button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div>
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
      >
        <FaArrowLeft size={20} />
        <span>Back</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md">
                <FaBook size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{homework.title}</h1>
                <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <FaGraduationCap size={12} className="text-indigo-400" />
                    Class {homework.class}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaBook size={12} className="text-indigo-400" />
                    {homework.subject}
                  </span>
                  {homework.teacher && (
                    <span className="flex items-center gap-1">
                      <FaUserTie size={12} className="text-indigo-400" />
                      {homework.teacher.firstName} {homework.teacher.lastName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FaCalendarAlt size={12} className="text-indigo-400" />
                    Due: {new Date(homework.dueDate).toLocaleDateString("en-GB")}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium flex items-center gap-1">
                <FaCheckCircle size={12} />
                {homework.submissions?.length || 0} submissions
              </span>

              {/* ─ Student / Parent Actions ────────────────────── */}
              {(isStudent || isParent) && (
                <>
                  {isParent && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedStudentId}
                        onChange={handleStudentChange}
                        className="px-3 py-1.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select student</option>
                        {students.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.firstName} {s.lastName || ""} - Class {s.class}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentStudentId ? (
                    !hasSubmitted ? (
                      <button
                        onClick={() => router.push(`/school/homework/${id}/submit`)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition text-sm flex items-center gap-2 shadow-md"
                      >
                        <FaPlus size={14} /> Submit Work
                      </button>
                    ) : (
                      mySubmission && (
                        <button
                          onClick={() =>
                            router.push(`/school/homework/${id}/submission/${mySubmission._id}`)
                          }
                          className="px-4 py-2 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition text-sm flex items-center gap-2 shadow-md"
                        >
                          <FaEdit size={14} /> View Submission
                        </button>
                      )
                    )
                  ) : (
                    isParent && (
                      <span className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full">
                        <FaInfoCircle size={14} /> Select a student
                      </span>
                    )
                  )}
                </>
              )}

              {/* ─ Teacher Actions ────────────────────────────── */}
              {isTeacher && (
                <button
                  onClick={() => router.push(`/school/homework/${id}/grade`)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition text-sm flex items-center gap-2 shadow-md"
                >
                  <FaEdit size={14} /> Grade Submissions
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Description ────────────────────────────────────── */}
        {homework.description && (
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <FaAlignLeft size={14} className="text-indigo-500" /> Description
            </h3>
            <div className="bg-gray-50 rounded-2xl p-4 text-gray-700 whitespace-pre-wrap">
              {homework.description}
            </div>
          </div>
        )}

        {/* ─── Submissions Table ─────────────────────────────── */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FaUserTie className="text-indigo-500" />
              Submissions
              <span className="text-sm font-normal text-gray-400">
                ({homework.submissions?.length || 0})
              </span>
            </h3>
          </div>

          {homework.submissions?.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <FaClock size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">No submissions yet</p>
              <p className="text-xs text-gray-300 mt-1">Students will submit their work here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      Score
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      Status
                    </th>
                    {isTeacher && (
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {homework.submissions.map((sub, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <span className="flex items-center gap-2">
                          <FaUser size={12} className="text-gray-400" />
                          {sub.student?.firstName} {sub.student?.lastName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(sub.submittedDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-700">
                        {sub.score !== undefined && sub.score !== null ? sub.score : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sub.score !== undefined && sub.score !== null ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <FaCheckCircle size={12} />
                            Graded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <FaClock size={12} />
                            Pending
                          </span>
                        )}
                      </td>
                      {isTeacher && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => router.push(`/school/homework/${id}/grade/${sub._id}`)}
                            className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition"
                          >
                            {sub.score !== undefined && sub.score !== null ? "Re-grade" : "Grade"}
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}