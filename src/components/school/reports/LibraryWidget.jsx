"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaBook, FaClock, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";

export default function LibraryWidget() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalBooks: 0,
    available: 0,
    borrowed: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentBorrowings, setRecentBorrowings] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Get library stats
        const statsRes = await api.get("/school/library/stats", headers);
        setStats(statsRes.data.data);

        // Get recent borrowings (limit 5)
        const borrowingsRes = await api.get("/school/library/borrowings", {
          params: { limit: 5 },
          ...headers,
        });
        setRecentBorrowings(borrowingsRes.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load library stats");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <FaBook className="text-indigo-500" /> Library Overview
        </h3>
        <button
          onClick={() => router.push("/school/library")}
          className="text-sm text-indigo-600 hover:text-indigo-800 transition"
        >
          View All →
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-indigo-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-600">{stats.totalBooks}</p>
          <p className="text-xs font-medium text-gray-500">Total Books</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.available}</p>
          <p className="text-xs font-medium text-gray-500">Available</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.borrowed}</p>
          <p className="text-xs font-medium text-gray-500">Borrowed</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          <p className="text-xs font-medium text-gray-500">Overdue</p>
        </div>
      </div>

      {/* Recent Borrowings */}
      {recentBorrowings.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Activity</p>
          <div className="space-y-1.5">
            {recentBorrowings.map((b) => (
              <div key={b._id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate">
                  <span className="font-medium">{b.book?.title}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span>{b.student?.firstName} {b.student?.lastName}</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  b.status === "borrowed" ? "bg-amber-100 text-amber-700" :
                  b.status === "overdue" ? "bg-red-100 text-red-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}