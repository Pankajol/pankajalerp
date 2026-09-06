"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaSave,
  FaUser,
  FaCalendarAlt,
  FaFileAlt,
  FaDownload,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function GradeSubmission() {
  const { id, submissionId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/homework/${id}/submission/${submissionId}`, headers);
        setSubmission(res.data.data);
        setScore(res.data.data.score || "");
        setFeedback(res.data.data.feedback || "");
      } catch (err) {
        toast.error("Failed to load submission");
        router.push(`/school/homework/${id}/grade`);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [id, submissionId, router]);

  const handleSubmit = async () => {
    if (!score || isNaN(score) || Number(score) < 0) {
      toast.error("Please enter a valid score");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.put(
        `/school/homework/${id}/submission/${submissionId}`,
        { score: Number(score), feedback },
        headers
      );
      toast.success("✅ Submission graded successfully!");
      router.push(`/school/homework/${id}/grade`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to grade submission");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading submission...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-700">Submission not found</h3>
      </div>
    );
  }

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

      {/* Grading Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
            <FaFileAlt size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Grade Submission</h2>
            <p className="text-sm text-gray-500">Review and grade student work</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student</p>
              <p className="font-medium text-gray-800 flex items-center gap-2 mt-1">
                <FaUser size={14} className="text-gray-400" />
                {submission.student?.firstName} {submission.student?.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted</p>
              <p className="font-medium text-gray-800 mt-1 flex items-center gap-2">
                <FaCalendarAlt size={14} className="text-gray-400" />
                {new Date(submission.submittedDate).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                submission.score !== undefined && submission.score !== null
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {submission.score !== undefined && submission.score !== null ? (
                  <>✅ Graded</>
                ) : (
                  <>⏳ Pending</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Submission Content */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Student's Answer
            </label>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 min-h-[100px] whitespace-pre-wrap">
              {submission.content || "No text content provided."}
            </div>
          </div>

          {submission.fileUrl && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Attached File
              </label>
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition"
              >
                <FaDownload size={14} /> Download File
              </a>
            </div>
          )}

          {/* Score */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Score <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Enter score"
              min="0"
              className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows="4"
              placeholder="Provide feedback to the student..."
              className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
            />
          </div>
        </div>

        {/* Actions */}
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
            <FaSave /> {saving ? "Saving..." : "Save Grade"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}