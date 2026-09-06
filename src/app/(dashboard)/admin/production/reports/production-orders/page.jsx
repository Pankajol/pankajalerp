"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaIndustry,
  FaCheck,
  FaSpinner,
  FaChartBar,
  FaTruck,
  FaTools,
  FaCheckCircle,
  FaCalendarAlt,
  FaArrowLeft,
  FaClipboardList,
  FaSearch,
  FaFilter,
  
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

const StatCard = ({ label, value, icon, color = "indigo", suffix = "" }) => {
  const map = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    gray: "bg-gray-50 text-gray-600",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${map[color] || map.indigo} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}{suffix}</p>
      </div>
    </div>
  );
};

export default function ProductionOrdersReport() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all") {
      if (statusFilter === "planned" && getOrderField(o, 'transferQty', 'transferqty') > 0) return false;
      if (statusFilter === "inprogress" && getOrderField(o, 'transferQty', 'transferqty') === 0) return false;
      if (statusFilter === "completed" && getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty') < (o.quantity || 0)) return false;
    }
    if (startDate) {
      const d = new Date(o.productionDate || o.createdAt);
      if (d < new Date(startDate)) return false;
    }
    if (endDate) {
      const d = new Date(o.productionDate || o.createdAt);
      if (d > new Date(endDate)) return false;
    }
    return true;
  });

  const totalOrders = filteredOrders.length;
  const totalQty = filteredOrders.reduce((s, o) => s + (o.quantity || 0), 0);
  const totalTransferred = filteredOrders.reduce((s, o) => s + getOrderField(o, 'transferQty', 'transferqty'), 0);
  const totalIssued = filteredOrders.reduce((s, o) => s + getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty'), 0);
  const totalReceived = filteredOrders.reduce((s, o) => s + getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty'), 0);
  const completionRate = totalQty > 0 ? ((totalReceived / totalQty) * 100).toFixed(1) : 0;

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Production Orders Report</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 outline-none">
                <option value="all">All</option>
                <option value="planned">Planned</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setStatusFilter("all"); setStartDate(""); setEndDate(""); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200">Clear</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Orders" value={totalOrders} icon={<FaIndustry />} color="indigo" />
          <StatCard label="Total Qty" value={totalQty} icon={<FaChartBar />} color="indigo" />
          <StatCard label="Transferred" value={totalTransferred} icon={<FaTruck />} color="amber" />
          <StatCard label="Issued" value={totalIssued} icon={<FaTools />} color="blue" />
          <StatCard label="Received" value={totalReceived} icon={<FaCheckCircle />} color="emerald" />
          <StatCard label="Completion" value={completionRate} suffix="%" icon={<FaCheck />} color="emerald" />
        </div>

        {/* Table */}
        <SectionCard icon={<FaClipboardList />} title="Order Details" color="indigo">
          {filteredOrders.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No orders match the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Order</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Product</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Planned</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Transferred</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Issued</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Received</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((o) => {
                    const qty = o.quantity || 0;
                    const t = getOrderField(o, 'transferQty', 'transferqty');
                    const i = getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty');
                    const r = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');
                    const status = r >= qty ? "Completed" : t > 0 ? "In Progress" : "Planned";
                    const statusColor = status === "Completed" ? "text-emerald-600 bg-emerald-50" : status === "In Progress" ? "text-amber-600 bg-amber-50" : "text-gray-600 bg-gray-50";
                    return (
                      <tr key={o._id} className="hover:bg-indigo-50/20">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{o.productionDocNo || o.orderNumber || "Draft"}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{typeof o.productDesc === "string" ? o.productDesc : "BOM Product"}</td>
                        <td className="px-4 py-3 text-center font-mono">{qty}</td>
                        <td className="px-4 py-3 text-center font-mono text-amber-600">{t}</td>
                        <td className="px-4 py-3 text-center font-mono text-blue-600">{i}</td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-600">{r}</td>
                        <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-black ${statusColor}`}>{status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
