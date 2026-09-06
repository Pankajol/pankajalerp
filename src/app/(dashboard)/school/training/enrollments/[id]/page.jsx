"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaEdit,
  FaUserGraduate,
  FaGraduationCap,
  FaAward,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function EnrollmentView() {
  const { id } = useParams();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/school/training/enrollments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEnrollment(res.data.data);
      } catch {
        toast.error("Enrollment not found");
        router.push("/school/training/enrollments");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!enrollment) return null;

  const statusIcon = {
    enrolled: <FaClock className="text-blue-500" size={24} />,
    completed: <FaCheckCircle className="text-green-500" size={24} />,
    dropped: <FaTimesCircle className="text-red-500" size={24} />,
  };

  const statusColor = {
    enrolled: "text-blue-600 bg-blue-50",
    completed: "text-green-600 bg-green-50",
    dropped: "text-red-600 bg-red-50",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all active:scale-95"
          >
            <FaArrowLeft size={22} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Enrollment Details
            </h1>
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <FaUserGraduate size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {enrollment.teacher?.firstName} {enrollment.teacher?.lastName}
                </h2>
                <p className="text-gray-500">{enrollment.teacher?.staffId}</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/school/training/enrollments/${id}/edit`)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all"
            >
              <FaEdit /> Edit
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Program</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaGraduationCap className="text-gray-400" />
                  {enrollment.program?.title || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusColor[enrollment.status]}`}>
                  {statusIcon[enrollment.status]}
                  <span className="font-medium capitalize">{enrollment.status}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Enrollment Date</p>
                <p className="text-lg font-medium">
                  {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Certificate</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaAward className={enrollment.certificateIssued ? "text-green-500" : "text-gray-300"} />
                  {enrollment.certificateIssued ? "Issued" : "Not Issued"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}