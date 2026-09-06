"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaEdit,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUserTie,
  FaGraduationCap,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function SessionView() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/school/training/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSession(res.data.data);
      } catch {
        toast.error("Session not found");
        router.push("/school/training/sessions");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, router]);

  const formatTime = (time) => {
    if (!time) return "—";
    const [h, m] = time.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!session) return null;

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
              Session Details
            </h1>
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <FaCalendarAlt size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{session.title}</h2>
                <p className="text-gray-500">{session.program?.title}</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/school/training/sessions/${id}/edit`)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all"
            >
              <FaEdit /> Edit
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-400" />
                  {new Date(session.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Program</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaGraduationCap className="text-gray-400" />
                  {session.program?.title || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaClock className="text-gray-400" />
                  {formatTime(session.startTime)} {session.endTime ? `- ${formatTime(session.endTime)}` : ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Facilitator</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaUserTie className="text-gray-400" />
                  {session.facilitator || "—"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Venue</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <FaMapMarkerAlt className="text-gray-400" />
                  {session.venue || "Not specified"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}