"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaEdit,
  FaGraduationCap,
  FaClock,
  FaCalendarAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ProgramView() {
  const { id } = useParams();
  const router = useRouter();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/school/training/programs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProgram(res.data.data);
      } catch {
        toast.error("Program not found");
        router.push("/school/training/programs");
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

  if (!program) return null;

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
              Program Details
            </h1>
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <FaGraduationCap size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{program.title}</h2>
                <p className="text-gray-500">{program.category}</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/school/training/programs/${id}/edit`)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all"
            >
              <FaEdit /> Edit
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaClock className="text-gray-400" /> {program.duration} hours
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    program.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {program.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-400" />
                  {program.startDate ? new Date(program.startDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-400" />
                  {program.endDate ? new Date(program.endDate).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700 mt-1 leading-relaxed">{program.description || "No description"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}