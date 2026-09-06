"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaBus,
  FaRoute,
  FaClock,
  FaMapMarkerAlt,
  FaUser,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function MyBusRoute() {
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        if (decoded.type === "student") {
          setStudentId(decoded.studentId || decoded.id);
        } else if (decoded.type === "parent") {
          // For parent, we could allow a dropdown, but for simplicity we'll use localStorage
          const saved = localStorage.getItem("schoolSelectedStudentId") || "";
          setStudentId(saved);
        }
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/bus/my-route", {
          params: { studentId },
          ...headers,
        });
        setAssignment(res.data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          // No assignment found – that's okay
          setAssignment(null);
        } else {
          toast.error("Failed to load your bus route");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [studentId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading your bus route...</p>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="text-center py-12">
        <FaUser className="text-4xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">Student not selected</h3>
        <p className="text-gray-400 mt-1">Please select a student to view their bus route.</p>
        {(user?.type === "parent") && (
          <button
            onClick={() => router.push("/school/students")}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition"
          >
            Select Student
          </button>
        )}
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <FaBus className="text-4xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">No Bus Assignment</h3>
        <p className="text-gray-400 mt-1">You have not been assigned to any bus route yet.</p>
        <p className="text-sm text-gray-300 mt-2">Please contact the school administration.</p>
      </div>
    );
  }

  const route = assignment.route;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md">
                <FaBus size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">My Bus Route</h1>
                <p className="text-sm text-gray-500">
                  {assignment.student?.firstName} {assignment.student?.lastName}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <FaRoute className="text-indigo-400" />
                  Route
                </div>
                <p className="font-medium text-gray-800">{route?.name}</p>
                {route?.description && (
                  <p className="text-sm text-gray-500 mt-1">{route.description}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <FaMapMarkerAlt className="text-indigo-400" />
                  Pickup Stop
                </div>
                <p className="font-medium text-gray-800">{assignment.stop}</p>
                {assignment.pickupTime && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <FaClock className="text-indigo-400" /> {assignment.pickupTime}
                  </p>
                )}
              </div>

              {assignment.dropTime && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <FaClock className="text-indigo-400" />
                    Drop Time
                  </div>
                  <p className="font-medium text-gray-800">{assignment.dropTime}</p>
                </div>
              )}
            </div>

            {route?.stops && route.stops.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <FaMapMarkerAlt className="text-indigo-500" /> Route Stops
                </h3>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <ul className="divide-y divide-gray-200">
                    {route.stops.map((stop, idx) => (
                      <li key={idx} className="py-2 flex items-center justify-between">
                        <span className="text-gray-700">{stop.stopName}</span>
                        <span className="text-sm text-gray-500">{stop.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}