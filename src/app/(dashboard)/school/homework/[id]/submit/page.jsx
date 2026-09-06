"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaAlignLeft,
  FaArrowLeft,
  FaBook,
  FaCalendarAlt,
  FaFileUpload,
  FaLink,
  FaSave,
  FaUser,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function SubmitHomework() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homework, setHomework] = useState(null);
  const [students, setStudents] = useState([]);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    student: "",
    content: "",
    fileName: "",
    fileUrl: "",
  });

  useEffect(() => {
    // Decode token to get user info
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { headers: { Authorization: `Bearer ${token}` } };

    const fetchData = async () => {
      try {
        // Fetch homework details
        const homeworkRes = await api.get(`/school/homework/${id}`, headers);
        setHomework(homeworkRes.data.data);

        // Determine user type
        const isStudent = user?.type === "student" || (user?.roles || []).includes("student");
        const isParent = user?.type === "parent" || (user?.roles || []).includes("parent");

        // For students: auto-set their own student ID
        if (isStudent) {
          const studentId = user?.studentId || user?.id;
          if (studentId) {
            setFormData((prev) => ({ ...prev, student: studentId }));
            // No need to fetch students list
            setStudents([]);
          } else {
            toast.error("Student ID not found in profile");
            router.push("/school/homework");
          }
          setLoading(false);
          return;
        }

        // For parents/teachers: fetch students list
        if (isParent || user?.type === "company" || (user?.roles || []).some(r => ["admin", "school admin", "principal", "teacher"].includes(r.toLowerCase()))) {
          const studentsRes = await api.get("/school/students", {
            params: { limit: 1000, isActive: true },
            ...headers,
          });
          const studentList = studentsRes.data.data || [];
          setStudents(studentList);

          // For parents: load saved selection from localStorage
          if (isParent) {
            const savedStudent = localStorage.getItem("schoolSelectedStudentId");
            if (savedStudent && studentList.some((s) => s._id === savedStudent)) {
              setFormData((prev) => ({ ...prev, student: savedStudent }));
            }
          }
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load homework");
        router.push("/school/homework");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.student) {
      toast.error("Please select student");
      return;
    }
    if (!formData.content.trim() && !formData.fileUrl.trim()) {
      toast.error("Please write an answer or add a file link");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        student: formData.student,
        content: formData.content,
        remarks: formData.content,
        files: formData.fileUrl.trim()
          ? [{ name: formData.fileName.trim() || "Attachment", url: formData.fileUrl.trim() }]
          : [],
      };

      await api.post(`/school/homework/${id}/submit`, payload, headers);
      // Save selected student for future use (parents)
      if (user?.type === "parent") {
        localStorage.setItem("schoolSelectedStudentId", formData.student);
      }
      toast.success("Homework submitted successfully");
      router.push(`/school/homework/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!homework) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-700">Homework not found</h3>
      </div>
    );
  }

  // Determine if the user is a student
  const isStudent = user?.type === "student" || (user?.roles || []).includes("student");

  // Find the selected student's name for display (if student is auto-selected)
  const selectedStudentName = isStudent
    ? (students.find(s => s._id === formData.student)?.firstName || "You") + " " + (students.find(s => s._id === formData.student)?.lastName || "")
    : "";

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
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <FaFileUpload size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Submit Homework</h2>
            <p className="text-sm text-gray-500">
              {isStudent ? "Submit your own work" : "Submit work for a student"}
            </p>
          </div>
        </div>

        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</p>
              <p className="text-sm font-medium text-gray-700">{homework.title}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</p>
              <p className="text-sm font-medium text-gray-700">{homework.subject}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Class</p>
              <p className="text-sm font-medium text-gray-700">Class {homework.class}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(homework.dueDate).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>
          {homework.description && (
            <div className="mt-3 pt-3 border-t border-indigo-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{homework.description}</p>
            </div>
          )}
        </div>

        <form>
          <div className="space-y-6">
            {/* ─── Student selection ──────────────────────────── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Student {!isStudent && <span className="text-red-500">*</span>}
              </label>
              {isStudent ? (
                // Student: show read‑only label (auto‑selected)
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 rounded-2xl border border-gray-200 text-gray-700">
                  <FaUser className="text-indigo-500" />
                  <span>{selectedStudentName || "You"}</span>
                  <span className="text-xs text-gray-400 ml-2">(auto‑selected)</span>
                </div>
              ) : (
                // Parent/Teacher: show dropdown
                <select
                  name="student"
                  value={formData.student}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white transition"
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.firstName} {student.lastName || ""} - Class {student.class}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ─── Content ────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Your Answer <span className="text-gray-400 text-xs font-normal">(or add a file link)</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows="6"
                placeholder="Write your answer here..."
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
              />
            </div>

            {/* ─── File link ───────────────────────────────────── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FaAlignLeft size={14} /> File Link
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  name="fileName"
                  value={formData.fileName}
                  onChange={handleChange}
                  placeholder="File name"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
                <div className="relative">
                  <FaLink className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="url"
                    name="fileUrl"
                    value={formData.fileUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-2xl pl-11 pr-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition disabled:opacity-60 shadow-md"
            >
              <FaSave /> {saving ? "Submitting..." : "Submit Homework"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}