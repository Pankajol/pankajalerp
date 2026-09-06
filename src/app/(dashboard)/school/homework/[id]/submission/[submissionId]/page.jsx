"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaUser,
  FaCalendarAlt,
  FaFileAlt,
  FaDownload,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ViewSubmission() {
  const { id, submissionId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/homework/${id}/submission/${submissionId}`, headers);
        setSubmission(res.data.data);
      } catch (err) {
        toast.error("Failed to load submission");
        router.push(`/school/homework/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [id, submissionId, router]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading...</p>
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

  const isGraded = submission.score !== undefined && submission.score !== null;

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

      {/* Submission Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <FaFileAlt size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Your Submission</h2>
            <p className="text-sm text-gray-500">Review your submitted work</p>
          </div>
        </div>

        {/* Status */}
        <div className={`rounded-2xl p-4 mb-6 border ${
          isGraded ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"
        }`}>
          <div className="flex items-center gap-2">
            {isGraded ? (
              <>
                <FaCheckCircle className="text-emerald-500" size={20} />
                <span className="font-medium text-emerald-700">Graded</span>
                <span className="text-emerald-600 ml-2">
                  Score: <strong>{submission.score}</strong>
                </span>
              </>
            ) : (
              <>
                <FaClock className="text-amber-500" size={20} />
                <span className="font-medium text-amber-700">Pending Review</span>
                <span className="text-amber-600 ml-2">Your work is being reviewed</span>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted On</p>
              <p className="font-medium text-gray-800 mt-1">
                {new Date(submission.submittedDate).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                isGraded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}>
                {isGraded ? "✅ Graded" : "⏳ Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Your Answer
          </label>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 min-h-[100px] whitespace-pre-wrap">
            {submission.content || "No text content provided."}
          </div>
        </div>

        {submission.fileUrl && (
          <div className="mt-4">
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

        {/* Feedback */}
        {isGraded && submission.feedback && (
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Teacher's Feedback
            </label>
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 text-gray-700 whitespace-pre-wrap">
              {submission.feedback}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}