"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { FaSearch, FaSync, FaTruck, FaCheckCircle, FaClock, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import Link from "next/link";

export default function VendorStockPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalSent: 0,
    totalReceived: 0,
    totalPending: 0,
    overdueCount: 0,
  });

  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await api.get(`/textiles/job-work/vendor-stock?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data || [];
      setVendors(data);

      // Calculate summary
      const totalSent = data.reduce((sum, v) => sum + v.totalSent, 0);
      const totalReceived = data.reduce((sum, v) => sum + v.totalReceived, 0);
      const totalPending = data.reduce((sum, v) => sum + v.pending, 0);
      const overdueCount = data.filter(v => v.overdueDays > 0).length;

      setSummary({ totalSent, totalReceived, totalPending, overdueCount });

      if (showToast) toast.success("Refreshed");
    } catch {
      setError("Failed to load vendor stock data");
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-5 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-20 mt-2" />
        </div>
        <div className="text-right">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-20 mt-1" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div><div className="h-3 bg-gray-200 rounded w-12" /><div className="h-4 bg-gray-200 rounded w-16 mt-1" /></div>
        <div><div className="h-3 bg-gray-200 rounded w-12" /><div className="h-4 bg-gray-200 rounded w-16 mt-1" /></div>
        <div><div className="h-3 bg-gray-200 rounded w-12" /><div className="h-4 bg-gray-200 rounded w-16 mt-1" /></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">🏭</span> Vendor Stock Dashboard
          </h1>
          <p className="text-sm text-gray-500">Track fabric sent to vendors & pending returns</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchData(true); }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && vendors.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><FaTruck className="text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Sent</p>
                <p className="text-lg font-bold text-gray-800">{summary.totalSent.toFixed(0)} Mtr</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><FaCheckCircle className="text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Received</p>
                <p className="text-lg font-bold text-gray-800">{summary.totalReceived.toFixed(0)} Mtr</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><FaClock className="text-amber-600" /></div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Pending</p>
                <p className="text-lg font-bold text-amber-600">{summary.totalPending.toFixed(0)} Mtr</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><FaExclamationTriangle className="text-red-600" /></div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Overdue Vendors</p>
                <p className="text-lg font-bold text-red-600">{summary.overdueCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchData(true); }} className="flex gap-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none w-60"
            />
          </div>
          <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">Search</button>
        </form>
        <span className="text-sm text-gray-500">{vendors.length} vendors</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm">Retry</button>
        </div>
      )}

      {/* Vendor Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gray-700">No vendor stock data</h3>
          <p className="text-gray-400 mt-2">Start by issuing challans to vendors.</p>
          <Link href="/admin/textiles/job-work/challans/new" className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">
            Create Challan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((v) => (
            <div key={v._id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-800">{v.vendorName}</h3>
                    {v.overdueDays > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                        {v.overdueDays} days overdue
                      </span>
                    )}
                  </div>
                  {v.vendorEmail && <p className="text-sm text-gray-500">{v.vendorEmail}</p>}
                  {v.vendorPhone && <p className="text-sm text-gray-500">{v.vendorPhone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Pending</p>
                  <p className={`text-xl font-bold ${v.pending > 0 ? "text-amber-600" : "text-green-600"}`}>
                    {v.pending.toFixed(0)} Mtr
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs text-gray-400">Sent</p>
                  <p className="font-bold text-gray-700">{v.totalSent.toFixed(0)} Mtr</p>
                  <p className="text-xs text-gray-400">{v.challanCount} challans</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Received</p>
                  <p className="font-bold text-gray-700">{v.totalReceived.toFixed(0)} Mtr</p>
                  <p className="text-xs text-gray-400">{v.receiptCount} receipts</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Shrinkage</p>
                  <p className={`font-bold ${v.avgShrinkage > 5 ? "text-red-500" : "text-gray-700"}`}>
                    {v.avgShrinkage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">{v.totalShrinkage.toFixed(0)} Mtr</p>
                </div>
              </div>

              {v.pending > 0 && v.lastIssuedDate && (
                <div className="mt-3 text-xs text-gray-400 border-t border-gray-50 pt-2">
                  Last issued: {new Date(v.lastIssuedDate).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}