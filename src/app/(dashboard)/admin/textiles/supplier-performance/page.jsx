"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaSync,
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaStar,
  FaTrophy,
  FaMedal,
  FaChartBar,
  FaUsers,
  FaCalculator,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function SupplierPerformancePage() {
  const [performances, setPerformances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [periodStart, setPeriodStart] = useState(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [periodEnd, setPeriodEnd] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [calculation, setCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const [perfRes, summaryRes] = await Promise.all([
        api.get("/textiles/supplier-performance", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/textiles/supplier-performance/summary", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setPerformances(perfRes.data.data || []);
      setSummary(summaryRes.data.data);
      if (showToast) toast.success("Refreshed");
    } catch {
      setError("Failed to load data");
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load suppliers
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuppliers(res.data.data || []);
      } catch {
        toast.error("Failed to load suppliers");
      }
    };
    loadSuppliers();
    fetchData();
  }, [fetchData]);

  // Calculate performance
  const handleCalculate = async () => {
    if (!selectedSupplier) return toast.warn("Please select a supplier");
    setCalculating(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        supplierId: selectedSupplier,
        periodStart,
        periodEnd,
        save: false,
      };
      const res = await api.post("/textiles/supplier-performance", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setCalculation(res.data.data.calculation);
        toast.success("Performance calculated!");
      } else {
        setError(res.data.message || "Calculation failed");
      }
    } catch {
      setError("Failed to calculate");
    } finally {
      setCalculating(false);
    }
  };

  // Save performance
  const handleSave = async () => {
    if (!calculation) return toast.warn("Calculate first");
    try {
      const token = localStorage.getItem("token");
      const payload = {
        supplierId: selectedSupplier,
        periodStart,
        periodEnd,
        save: true,
        status: "draft",
        remarks: `Performance evaluation for ${periodStart} to ${periodEnd}`,
      };
      const res = await api.post("/textiles/supplier-performance", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Performance saved!");
        setCalculation(null);
        fetchData(true);
      }
    } catch {
      toast.error("Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this performance record?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/supplier-performance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const getRatingColor = (rating) => {
    const map = {
      A: "text-emerald-600 bg-emerald-50",
      B: "text-blue-600 bg-blue-50",
      C: "text-yellow-600 bg-yellow-50",
      D: "text-orange-600 bg-orange-50",
      F: "text-red-600 bg-red-50",
    };
    return map[rating] || "text-gray-600 bg-gray-50";
  };

  const getRatingIcon = (rating) => {
    if (rating === "A") return <FaTrophy className="text-emerald-500" />;
    if (rating === "B") return <FaMedal className="text-blue-500" />;
    if (rating === "C") return <FaStar className="text-yellow-500" />;
    return <FaTimesCircle className="text-red-500" />;
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaUsers size={24} className="text-purple-600" />
            Supplier Performance
          </h1>
          <p className="text-sm text-gray-500">Evaluate and rate supplier performance</p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            fetchData(true);
          }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
        </button>
      </div>

      {/* Rating Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {["A", "B", "C", "D", "F"].map((rating) => {
            const data = summary.summary?.find((s) => s._id === rating);
            return (
              <div
                key={rating}
                className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center ${getRatingColor(rating)}`}
              >
                <div className="flex items-center justify-center gap-2">
                  {getRatingIcon(rating)}
                  <span className="text-2xl font-bold">{rating}</span>
                </div>
                <p className="text-sm font-medium">{data?.count || 0} suppliers</p>
                <p className="text-xs text-gray-500">Avg {data?.avgOverallScore?.toFixed(1) || 0}%</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Suppliers */}
      {summary?.topSuppliers && summary.topSuppliers.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <FaTrophy className="text-yellow-500" /> Top Performing Suppliers
          </h3>
          <div className="flex flex-wrap gap-4">
            {summary.topSuppliers.map((s, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-2xl font-bold text-gray-300">#{idx + 1}</span>
                <div>
                  <p className="font-bold text-gray-800">{s.supplierName}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRatingColor(s.rating)}`}>
                      {s.rating}
                    </span>
                    <span className="text-xs text-gray-500">{s.overallScore.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calculator */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FaCalculator size={18} className="text-purple-600" />
          Calculate Supplier Performance
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none min-w-[180px]"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Period End</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
            />
          </div>
          <button
            onClick={handleCalculate}
            disabled={calculating || !selectedSupplier}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50"
          >
            {calculating ? "Calculating..." : "Calculate"}
          </button>
          {calculation && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
            >
              <FaPlus size={14} /> Save
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Calculation Results */}
        {calculation && (
          <div className="mt-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400">Overall Rating</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getRatingColor(calculation.rating)} px-3 py-1 rounded-lg`}>
                      {calculation.rating}
                    </span>
                    <span className="text-sm text-gray-600">{calculation.overallScore.toFixed(1)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Quality</p>
                  <p className="text-lg font-bold text-gray-800">{calculation.qualityScore.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{calculation.passedInspections}/{calculation.totalInspections} passed</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Delivery</p>
                  <p className="text-lg font-bold text-gray-800">{calculation.deliveryScore.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{calculation.onTimeOrders}/{calculation.totalOrders} on-time</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Shrinkage</p>
                  <p className="text-lg font-bold text-gray-800">{calculation.avgShrinkage.toFixed(2)}%</p>
                  <p className="text-xs text-gray-500">{calculation.totalReceivedQty.toFixed(0)}/{calculation.totalSentQty.toFixed(0)} received</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${calculation.overallScore}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Saved Performance Records</h3>
          <span className="text-sm text-gray-500">{performances.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Supplier</th>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Period</th>
                <th className="px-6 py-3 text-center text-[10.5px] font-bold uppercase text-gray-400">Rating</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Quality</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Delivery</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Overall</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : performances.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    No performance records found
                  </td>
                </tr>
              ) : (
                performances.map((p) => (
                  <tr key={p._id} className="hover:bg-purple-50/20 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {p.supplier?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${getRatingColor(p.rating)}`}>
                        {p.rating}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{p.qualityScore.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-right font-medium">{p.deliveryScore.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-right font-bold text-purple-600">
                      {p.overallScore.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link href={`/admin/textiles/supplier-performance/${p._id}`} className="p-2 text-gray-400 hover:text-purple-600">
                        <FaEye size={14} />
                      </Link>
                      <button onClick={() => handleDelete(p._id)} className="p-2 text-gray-400 hover:text-red-500">
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}