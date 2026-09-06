"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaChartLine,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
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

export default function EfficiencyReport() {
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

  // Compute efficiency per order
  const efficiencyData = orders.map((o) => {
    const planned = o.quantity || 0;
    const transferred = getOrderField(o, "transferQty", "transferqty");
    const issued = getOrderField(o, "isSuForProductionQty", "issuforproductionqty");
    const received = getOrderField(o, "receiptForProductionQty", "reciptforproductionqty");

    // Stage completion percentages (each step's progress toward planned)
    const transferPct = planned > 0 ? (transferred / planned) * 100 : 0;
    const issuePct = planned > 0 ? (issued / planned) * 100 : 0;
    const receiptPct = planned > 0 ? (received / planned) * 100 : 0;

    // Overall efficiency = receiptPct (since that's final)
    const overall = receiptPct;

    // Determine status: "On Track" if receiptPct >= 80%, "Behind" if 40-80%, "Critical" if <40%
    let status = "On Track";
    let statusColor = "text-emerald-600 bg-emerald-50";
    if (overall < 40) {
      status = "Critical";
      statusColor = "text-red-600 bg-red-50";
    } else if (overall < 80) {
      status = "Behind";
      statusColor = "text-amber-600 bg-amber-50";
    }

    return {
      ...o,
      planned,
      transferred,
      issued,
      received,
      transferPct,
      issuePct,
      receiptPct,
      overall,
      status,
      statusColor,
    };
  });

  // Sort by overall efficiency ascending (worst first)
  efficiencyData.sort((a, b) => a.overall - b.overall);

  const totalEfficiency = efficiencyData.reduce((sum, d) => sum + d.overall, 0);
  const avgEfficiency = efficiencyData.length > 0 ? (totalEfficiency / efficiencyData.length).toFixed(1) : 0;

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Production Efficiency</h1>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-gray-400">Average Efficiency</p>
            <p className="text-3xl font-black text-indigo-600">{avgEfficiency}%</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-gray-400">Total Orders</p>
            <p className="text-3xl font-black text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-gray-400">On Track / Behind / Critical</p>
            <p className="text-3xl font-black text-gray-900">
              {efficiencyData.filter(d => d.status === "On Track").length} /{" "}
              {efficiencyData.filter(d => d.status === "Behind").length} /{" "}
              {efficiencyData.filter(d => d.status === "Critical").length}
            </p>
          </div>
        </div>

        {/* Table */}
        <SectionCard icon={<FaChartLine />} title="Order Efficiency" subtitle="Sorted from worst to best" color="blue">
          {efficiencyData.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Order</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Product</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Planned</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Transfer %</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Issue %</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Receipt %</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {efficiencyData.map((d) => (
                    <tr key={d._id} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">
                        {d.productionDocNo || d.orderNumber || "Draft"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {typeof d.productDesc === "string" ? d.productDesc : "BOM Product"}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{d.planned}</td>
                      <td className="px-4 py-3 text-center font-mono text-amber-600">{Math.round(d.transferPct)}%</td>
                      <td className="px-4 py-3 text-center font-mono text-blue-600">{Math.round(d.issuePct)}%</td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600">{Math.round(d.receiptPct)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${d.statusColor}`}>
                          {d.status}
                        </span>
                      </td>
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
