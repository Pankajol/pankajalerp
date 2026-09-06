"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaSync,
  FaPlay,
  FaSave,
  FaEye,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaShoppingCart,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function MRPPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [horizonStart, setHorizonStart] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [horizonEnd, setHorizonEnd] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [calculation, setCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved MRP runs
  const fetchRuns = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/textiles/mrp/runs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRuns(res.data.data || []);
      if (showToast) toast.success("Refreshed");
    } catch {
      setError("Failed to load MRP runs");
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Run MRP calculation
  const handleRunMRP = async () => {
    setCalculating(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        horizonStart,
        horizonEnd,
      });
      const res = await api.get(`/textiles/mrp?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setCalculation(res.data.data);
        toast.success(`MRP calculation complete: ${res.data.data.items.length} items`);
      } else {
        setError(res.data.message || "Calculation failed");
      }
    } catch {
      setError("Failed to calculate MRP");
    } finally {
      setCalculating(false);
    }
  };

  // Save the current calculation as a run
  const handleSaveMRP = async () => {
    if (!calculation || !calculation.items || calculation.items.length === 0) {
      return toast.warn("No calculation to save. Run MRP first.");
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        horizonStart,
        horizonEnd,
        items: calculation.items,
        remarks: `MRP run for ${horizonStart} to ${horizonEnd}`,
      };
      const res = await api.post("/textiles/mrp", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("MRP run saved!");
        fetchRuns(true);
        setCalculation(null);
      } else {
        toast.error(res.data.message || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRun = async (id) => {
    if (!confirm("Delete this MRP run?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/mrp/runs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchRuns();
    } catch {
      toast.error("Delete failed");
    }
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaShoppingCart size={24} className="text-indigo-600" />
            Material Requirement Planning (MRP)
          </h1>
          <p className="text-sm text-gray-500">Plan raw material purchases based on production orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchRuns(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* MRP Run Calculator */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Run MRP</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Horizon Start</label>
            <input
              type="date"
              value={horizonStart}
              onChange={(e) => setHorizonStart(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Horizon End</label>
            <input
              type="date"
              value={horizonEnd}
              onChange={(e) => setHorizonEnd(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <button
            onClick={handleRunMRP}
            disabled={calculating}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <FaPlay size={14} /> {calculating ? "Calculating..." : "Run MRP"}
          </button>
          {calculation && (
            <button
              onClick={handleSaveMRP}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
            >
              <FaSave size={14} /> {saving ? "Saving..." : "Save Run"}
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
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400">Total Items</p>
                  <p className="text-xl font-bold text-gray-800">{calculation.totalItems}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Net Requirement</p>
                  <p className="text-xl font-bold text-indigo-600">{calculation.totalNetRequirement} units</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Production Orders</p>
                  <p className="text-xl font-bold text-gray-800">{calculation.ordersCount}</p>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Required</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.items.slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {item.item?.itemName || "Unknown"}
                        </td>
                        <td className="px-3 py-2 text-right">{item.requiredQty.toFixed(0)}</td>
                        <td className="px-3 py-2 text-right">{item.availableStock.toFixed(0)}</td>
                        <td className="px-3 py-2 text-right font-bold text-indigo-600">
                          {item.netRequirement.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {calculation.items.length > 20 && (
                  <p className="text-xs text-gray-400 mt-2">... and {calculation.items.length - 20} more items</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Saved MRP Runs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Saved MRP Runs</h3>
          <span className="text-sm text-gray-500">{runs.length} runs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Run #</th>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Date</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Items</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Net Req.</th>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No MRP runs saved. Run MRP to create one.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r._id} className="hover:bg-indigo-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">{r.runNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(r.runDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right font-bold">{r.totalItems}</td>
                    <td className="px-6 py-4 text-right font-bold">{r.totalNetRequirement}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        r.status === "approved" ? "bg-green-100 text-green-700" :
                        r.status === "review" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button onClick={() => setCalculation({ ...r, items: r.items || [] })} className="p-2 text-gray-400 hover:text-indigo-600" aria-label={`View ${r.runNumber}`}>
                        <FaEye size={14} />
                      </button>
                      <button onClick={() => handleDeleteRun(r._id)} className="p-2 text-gray-400 hover:text-red-500">
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
