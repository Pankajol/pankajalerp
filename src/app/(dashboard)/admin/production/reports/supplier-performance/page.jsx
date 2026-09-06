"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaIndustry,
  FaChartBar,
  FaArrowLeft,
  FaBox,
  FaMoneyBillWave,
  FaClock,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

const getOrderField = (order, cap, low) => {
  if (!order) return 0;
  const val = order[cap] ?? order[low];
  return Number(val) || 0;
};

const SectionCard = ({ icon, title, subtitle, children, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-50/40 border-indigo-100",
    emerald: "bg-emerald-50/40 border-emerald-100",
    amber: "bg-amber-50/40 border-amber-100",
    blue: "bg-blue-50/40 border-blue-100",
    red: "bg-red-50/40 border-red-100",
  };
  const bg = colors[color] || colors.indigo;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${bg}`}>
        <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center text-indigo-500">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = "indigo" }) => {
  const map = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    gray: "bg-gray-50 text-gray-600",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${map[color] || map.indigo} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default function SupplierPerformance() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/production-orders?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(Array.isArray(res.data) ? res.data : res.data?.orders || []);
    } catch (err) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Aggregate suppliers from item batches (only if batch data exists)
  const supplierMap = {};
  orders.forEach((o) => {
    // Check items for manufacturer info (from batches)
    (o.items || []).forEach((item) => {
      // We need to look at batches, but we don't have batch info in the order list.
      // We'll assume you have a separate API for batches. For now, we'll aggregate by item name as a placeholder.
      // In a real system, you'd fetch batch details from a Batch model.
      const manufacturer = item.manufacturer || "Unknown";
      const key = manufacturer;
      if (!supplierMap[key]) {
        supplierMap[key] = {
          name: manufacturer,
          totalQty: 0,
          totalCost: 0,
          orderCount: 0,
        };
      }
      const qty = item.quantity || 0;
      const price = item.unitPrice || 0;
      supplierMap[key].totalQty += qty;
      supplierMap[key].totalCost += qty * price;
      supplierMap[key].orderCount += 1;
    });
    // Also resources could have manufacturer
    (o.resources || []).forEach((res) => {
      const manufacturer = res.manufacturer || "Unknown";
      const key = manufacturer;
      if (!supplierMap[key]) {
        supplierMap[key] = {
          name: manufacturer,
          totalQty: 0,
          totalCost: 0,
          orderCount: 0,
        };
      }
      const qty = res.quantity || 0;
      const price = res.unitPrice || 0;
      supplierMap[key].totalQty += qty;
      supplierMap[key].totalCost += qty * price;
      supplierMap[key].orderCount += 1;
    });
  });

  const supplierList = Object.values(supplierMap).sort((a, b) => b.totalQty - a.totalQty);
  const totalSuppliers = supplierList.length;
  const totalQty = supplierList.reduce((s, i) => s + i.totalQty, 0);
  const totalCost = supplierList.reduce((s, i) => s + i.totalCost, 0);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Supplier / Manufacturer Performance</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Suppliers" value={totalSuppliers} icon={<FaIndustry />} color="indigo" />
          <StatCard label="Total Supply Qty" value={totalQty} icon={<FaBox />} color="amber" />
          <StatCard label="Total Cost" value={`₹${totalCost.toFixed(0)}`} icon={<FaMoneyBillWave />} color="emerald" />
        </div>

        <SectionCard icon={<FaIndustry />} title="Supplier Breakdown" color="blue">
          {supplierList.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No supplier data found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Supplier</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Orders</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Total Qty</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400">Total Cost</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Avg Cost/Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {supplierList.map((s, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-center">{s.orderCount}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{s.totalQty}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{s.totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center font-mono">₹{(s.totalQty > 0 ? s.totalCost / s.totalQty : 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
