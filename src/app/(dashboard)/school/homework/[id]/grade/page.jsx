"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaBook,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaEdit,
  FaFileAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function GradeHomework() {
  const { id } = useParams();
  const router = useRouter();
  const [homework, setHomework] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
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

  const pendingSubmissions = homework.submissions?.filter(
    (sub) => sub.score === undefined || sub.score === null
  ) || [];

  const gradedSubmissions = homework.submissions?.filter(
    (sub) => sub.score !== undefined && sub.score !== null
  ) || [];

  return (
    <div>
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
      >
        <FaArrowLeft size={20} />
        <span>Back</span>
      </motion.button>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md">
              <FaBook size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{homework.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Class {homework.class} · {homework.subject}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
            <p className="text-2xl font-bold text-indigo-600">{homework.submissions?.length || 0}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Submissions</p>
          </div>
          <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{pendingSubmissions.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Grading</p>
          </div>
          <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{gradedSubmissions.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Graded</p>
          </div>
        </div>

        {/* Pending Submissions */}
        {pendingSubmissions.length > 0 && (
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <FaClock className="text-amber-500" />
              Pending Submissions
              <span className="text-sm font-normal text-gray-400">({pendingSubmissions.length})</span>
            </h3>
            <div className="space-y-3">
              {pendingSubmissions.map((sub, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between bg-amber-50/50 rounded-2xl p-4 border border-amber-100 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                      <FaUser size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {sub.student?.firstName} {sub.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">
                        Submitted: {new Date(sub.submittedDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/school/homework/${id}/grade/${sub._id}`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition text-sm flex items-center gap-2"
                  >
                    <FaEdit size={14} /> Grade
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Graded Submissions */}
        {gradedSubmissions.length > 0 && (
          <div className="p-6">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <FaCheckCircle className="text-emerald-500" />
              Graded Submissions
              <span className="text-sm font-normal text-gray-400">({gradedSubmissions.length})</span>
            </h3>
            <div className="space-y-3">
              {gradedSubmissions.map((sub, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <FaUser size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {sub.student?.firstName} {sub.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">
                        Score: <span className="font-bold text-emerald-600">{sub.score}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/school/homework/${id}/grade/${sub._id}`)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition text-sm flex items-center gap-2"
                  >
                    <FaEdit size={14} /> Re-grade
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {homework.submissions?.length === 0 && (
          <div className="p-12 text-center">
            <FaFileAlt size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No submissions to grade yet</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}