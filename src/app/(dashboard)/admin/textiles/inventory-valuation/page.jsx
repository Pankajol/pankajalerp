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
  FaChartLine,
  FaCalculator,
  FaBoxes,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function InventoryValuationPage() {
  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [method, setMethod] = useState("fifo");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [calculation, setCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/textiles/inventory-valuation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setValuations(res.data.data || []);
      if (showToast) toast.success("Refreshed");
    } catch {
      setError("Failed to load valuations");
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load master data
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [itemRes, whRes] = await Promise.all([
          api.get("/items?limit=100", headers),
          api.get("/warehouses", headers),
        ]);
        setItems(itemRes.data.data || []);
        setWarehouses(whRes.data.data || []);
        await fetchData();
      } catch {
        toast.error("Failed to load master data");
        setLoading(false);
      }
    };
    loadMasters();
  }, [fetchData]);

  // Run valuation calculation
  const handleCalculate = async () => {
    setCalculating(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        method,
        itemId: selectedItem || undefined,
        warehouse: selectedWarehouse || undefined,
        save: false,
      };
      const res = await api.post("/textiles/inventory-valuation", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setCalculation(res.data.data);
        toast.success(`Valuation calculated: ${res.data.data.totalItems} items`);
      } else {
        setError(res.data.message || "Calculation failed");
      }
    } catch {
      setError("Failed to calculate valuation");
    } finally {
      setCalculating(false);
    }
  };

  // Save valuation
  const handleSave = async () => {
    if (!calculation) return toast.warn("Please calculate valuation first");
    try {
      const token = localStorage.getItem("token");
      const payload = {
        method,
        itemId: selectedItem || undefined,
        warehouse: selectedWarehouse || undefined,
        save: true,
        status: "draft",
        remarks: `Valuation using ${method.toUpperCase()} method`,
      };
      const res = await api.post("/textiles/inventory-valuation", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Valuation saved!");
        setCalculation(null);
        fetchData(true);
      }
    } catch {
      toast.error("Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this valuation?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/inventory-valuation/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const getMethodLabel = (method) => {
    const map = {
      fifo: "FIFO",
      lifo: "LIFO",
      "weighted-average": "Weighted Avg",
    };
    return map[method] || method;
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
            <FaChartLine size={24} className="text-emerald-600" />
            Inventory Valuation
          </h1>
          <p className="text-sm text-gray-500">Calculate inventory value using FIFO/LIFO/Weighted Average</p>
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

      {/* Calculator */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FaCalculator size={18} className="text-emerald-600" />
          Calculate Valuation
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
            >
              <option value="fifo">FIFO</option>
              <option value="lifo">LIFO</option>
              <option value="weighted-average">Weighted Average</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Item (Optional)</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none min-w-[150px]"
            >
              <option value="">All Items</option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>{i.itemName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Warehouse</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {calculating ? "Calculating..." : "Calculate"}
          </button>
          {calculation && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
            >
              <FaPlus size={14} /> Save Valuation
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
                  <p className="text-xs text-gray-400">Method</p>
                  <p className="text-lg font-bold text-gray-800">{getMethodLabel(calculation.method)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Items</p>
                  <p className="text-lg font-bold text-gray-800">{calculation.totalItems}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Value</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ₹{calculation.items?.reduce((sum, i) => sum + i.totalCost, 0)?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Cost</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.items?.slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {item.item?.itemName || "Unknown"}
                        </td>
                        <td className="px-3 py-2 text-right">{item.totalQuantity.toFixed(0)}</td>
                        <td className="px-3 py-2 text-right">₹{item.unitCost?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600">
                          ₹{item.totalCost?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {calculation.items?.length > 20 && (
                  <p className="text-xs text-gray-400 mt-2">... and {calculation.items.length - 20} more items</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Saved Valuations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Saved Valuations</h3>
          <span className="text-sm text-gray-500">{valuations.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Valuation #</th>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Date</th>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Method</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Items</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Total Value</th>
                <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : valuations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    No valuations saved. Run and save a valuation.
                  </td>
                </tr>
              ) : (
                valuations.map((v) => (
                  <tr key={v._id} className="hover:bg-emerald-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">{v.valuationNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(v.valuationDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-600">{getMethodLabel(v.method)}</td>
                    <td className="px-6 py-4 text-right font-bold">{v.totalItems}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      ₹{v.totalValue?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        v.status === "approved" ? "bg-green-100 text-green-700" :
                        v.status === "archived" ? "bg-gray-100 text-gray-500" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link href={`/admin/textiles/inventory-valuation/${v._id}`} className="p-2 text-gray-400 hover:text-emerald-600">
                        <FaEye size={14} />
                      </Link>
                      <button onClick={() => handleDelete(v._id)} className="p-2 text-gray-400 hover:text-red-500">
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