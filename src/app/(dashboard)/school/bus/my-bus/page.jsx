"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaBus,
  FaMapMarkerAlt,
  FaClock,
  FaRoute,
  FaUser,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function MyBusPage() {
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [tracker, setTracker] = useState(null);
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
          const saved = localStorage.getItem("schoolSelectedStudentId") || "";
          setStudentId(saved);
        }
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Get assignment
        const assignRes = await api.get("/school/bus/my-route", {
          params: { studentId },
          ...headers,
        });
        const ass = assignRes.data.data;
        setAssignment(ass);

        // If assignment has a route, fetch the vehicle for that route
        if (ass && ass.route) {
          // Find a vehicle assigned to this route
          const vehiclesRes = await api.get("/school/bus/vehicles", {
            params: { route: ass.route._id, limit: 1 },
            ...headers,
          });
          const vehicle = vehiclesRes.data.data?.[0];
          if (vehicle) {
            // Fetch tracker for that vehicle
            const trackerRes = await api.get("/school/bus/tracker", {
              params: { vehicle: vehicle._id },
              ...headers,
            });
            const trackerData = trackerRes.data.data?.[0];
            setTracker(trackerData || null);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load bus information");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [studentId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading bus information...</p>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="text-center py-12">
        <FaUser className="text-4xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">Student not selected</h3>
        <p className="text-gray-400 mt-1">Please select a student to view their bus.</p>
        {user?.type === "parent" && (
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
        <p className="text-gray-400 mt-1">You are not assigned to any bus route.</p>
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
                <h1 className="text-2xl font-bold text-gray-800">My Bus</h1>
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
                <p className="text-sm text-gray-500 mt-1">{route?.description}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <FaMapMarkerAlt className="text-indigo-400" />
                  Stop
                </div>
                <p className="font-medium text-gray-800">{assignment.stop}</p>
                {assignment.pickupTime && (
                  <p className="text-sm text-gray-500 mt-1">
                    Pickup: {assignment.pickupTime}
                  </p>
                )}
              </div>
            </div>

            {tracker ? (
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
                <h3 className="font-semibold text-indigo-800 flex items-center gap-2 mb-3">
                  <FaBus size={18} /> Bus Live Location
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FaMapMarkerAlt className="text-indigo-400" />
                    <span>
                      Lat: {tracker.latitude.toFixed(6)}, Lon: {tracker.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <FaClock className="text-indigo-400" />
                    <span>
                      Status: <span className="font-medium">{tracker.status}</span>
                    </span>
                  </div>
                  {tracker.speed > 0 && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <FaClock className="text-indigo-400" />
                      <span>Speed: {tracker.speed} km/h</span>
                    </div>
                  )}
                  {tracker.nextStop && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <FaRoute className="text-indigo-400" />
                      <span>Next Stop: {tracker.nextStop}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Last updated: {new Date(tracker.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100 text-sm text-yellow-700">
                <p>Bus location not available yet. Please check back later.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}