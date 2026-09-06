"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaMoneyBillWave,
  FaArrowLeft,
  FaBox,
  FaCogs,
  FaUserCog,
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

export default function CostAnalysisReport() {
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

  // Aggregate costs
  let totalMaterialCost = 0;
  let totalResourceCost = 0;
  let totalOperationCost = 0;
  const perOrderCosts = orders.map((o) => {
    const materialCost = (o.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
    const resourceCost = (o.resources || []).reduce((sum, res) => sum + (res.total || 0), 0);
    // Operation cost: sum of operation costs from operationFlow (if operation has cost)
    const operationCost = (o.operationFlow || []).reduce((sum, step) => {
      return sum + (step.operation?.cost || 0);
    }, 0);
    totalMaterialCost += materialCost;
    totalResourceCost += resourceCost;
    totalOperationCost += operationCost;
    return {
      ...o,
      materialCost,
      resourceCost,
      operationCost,
      totalCost: materialCost + resourceCost + operationCost,
    };
  });

  const grandTotal = totalMaterialCost + totalResourceCost + totalOperationCost;

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Cost Analysis</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Material Cost" value={`₹${totalMaterialCost.toFixed(0)}`} icon={<FaBox />} color="indigo" />
          <StatCard label="Resource Cost" value={`₹${totalResourceCost.toFixed(0)}`} icon={<FaCogs />} color="amber" />
          <StatCard label="Operation Cost" value={`₹${totalOperationCost.toFixed(0)}`} icon={<FaUserCog />} color="blue" />
          <StatCard label="Grand Total" value={`₹${grandTotal.toFixed(0)}`} icon={<FaMoneyBillWave />} color="emerald" />
        </div>

        {/* Per‑Order Breakdown */}
        <SectionCard icon={<FaMoneyBillWave />} title="Cost Breakdown per Order" color="red">
          {perOrderCosts.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Order</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Product</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400">Materials</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400">Resources</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400">Operations</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {perOrderCosts.map((o) => (
                    <tr key={o._id} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">
                        {o.productionDocNo || o.orderNumber || "Draft"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {typeof o.productDesc === "string" ? o.productDesc : "BOM Product"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">₹{o.materialCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{o.resourceCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{o.operationCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">₹{o.totalCost.toFixed(2)}</td>
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
