"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaBook,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function MyBorrowings() {
  const router = useRouter();
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        setUser(jwtDecode(token));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const fetchBorrowings = async () => {
      if (!user) return;
      const studentId = user.studentId || user.id;
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/library/borrowings", {
          params: { student: studentId, limit: 50 },
          ...headers,
        });
        setBorrowings(res.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load your borrowings");
      } finally {
        setLoading(false);
      }
    };
    fetchBorrowings();
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Please log in to view your borrowings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading your borrowings...</p>
      </div>
    );
  }

  const activeBorrowings = borrowings.filter((b) => b.status === "borrowed" || b.status === "overdue");
  const overdueBorrowings = borrowings.filter((b) => b.status === "overdue");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBook className="text-indigo-500" size={24} />
            My Borrowings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeBorrowings.length} active • {overdueBorrowings.length} overdue
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Borrowed</p>
          <p className="text-2xl font-bold text-gray-800">{borrowings.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-amber-600">{activeBorrowings.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{overdueBorrowings.length}</p>
        </div>
      </div>

      {/* Borrowings List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Book</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Borrowed</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Due Date</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {borrowings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                        <FaBook size={24} className="text-indigo-300" />
                      </div>
                      <p className="text-gray-400">You haven't borrowed any books yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                borrowings.map((b, idx) => (
                  <motion.tr
                    key={b._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800">{b.book?.title || "Deleted book"}</span>
                      <span className="text-xs text-gray-400 block">{b.book?.author}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(b.borrowedDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      <span className={`flex items-center gap-1 ${b.status === "overdue" ? "text-red-600 font-bold" : ""}`}>
                        <FaCalendarAlt size={12} />
                        {new Date(b.dueDate).toLocaleDateString("en-GB")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        b.status === "borrowed" ? "bg-amber-100 text-amber-700" :
                        b.status === "overdue" ? "bg-red-100 text-red-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {b.status === "borrowed" && <FaClock size={12} />}
                        {b.status === "overdue" && <FaExclamationTriangle size={12} />}
                        {b.status === "returned" && <FaCheckCircle size={12} />}
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {b.fine && b.fine > 0 ? (
                        <span className="text-red-600 font-bold">₹{b.fine.toFixed(2)}</span>
                      ) : b.status === "overdue" ? (
                        <span className="text-yellow-600">Calculating...</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}