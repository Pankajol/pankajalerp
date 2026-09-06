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
  FaPercentage,
  FaCalendarAlt,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import ProductionReportExportActions from "@/components/reports/ProductionReportExportActions";

// ─── Helper to read fields with fallback ──────────────────────
const getOrderField = (order, capitalKey, lowerKey) => {
  if (!order) return 0;
  const val = order[capitalKey] ?? order[lowerKey];
  return Number(val) || 0;
};

// ─── Reusable UI ──────────────────────────────────────────────
const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => {
  const colorMap = {
    indigo: { headerBg: "bg-indigo-50/40", iconBg: "bg-indigo-100", iconText: "text-indigo-500" },
    emerald: { headerBg: "bg-emerald-50/40", iconBg: "bg-emerald-100", iconText: "text-emerald-500" },
    amber: { headerBg: "bg-amber-50/40", iconBg: "bg-amber-100", iconText: "text-amber-500" },
    blue: { headerBg: "bg-blue-50/40", iconBg: "bg-blue-100", iconText: "text-blue-500" },
    red: { headerBg: "bg-red-50/40", iconBg: "bg-red-100", iconText: "text-red-500" },
  };
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${c.headerBg}`}>
        <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center ${c.iconText}`}>
          <Icon className="text-sm" />
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
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    gray: "bg-gray-50 text-gray-600",
  };
  const bgColor = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}{suffix}</p>
      </div>
    </div>
  );
};

// ─── Progress Bar with Icon ──────────────────────────────────────
const ProgressBar = ({ current, total, label, icon: Icon, color = "indigo", showPercent = true }) => {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const colors = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-600",
    blue: "bg-blue-600",
    red: "bg-red-600",
  };
  const barColor = colors[color] || colors.indigo;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-24 text-xs font-medium text-gray-500">
        <Icon className="text-sm" />
        <span>{label}</span>
      </div>
      <div className="flex-1">
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {showPercent && (
        <div className="w-12 text-right text-xs font-mono font-bold text-gray-700">
          {Math.round(pct)}%
        </div>
      )}
    </div>
  );
};

// ─── Donut Chart (pure SVG) ─────────────────────────────────────
const DonutChart = ({ segments, size = 120, strokeWidth = 20 }) => {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (total === 0) return <p className="text-gray-400 text-center">No data</p>;

  const paths = segments.map((seg) => {
    const fraction = seg.value / total;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const x1 = center + radius * Math.sin(startAngle);
    const y1 = center - radius * Math.cos(startAngle);
    const x2 = center + radius * Math.sin(endAngle);
    const y2 = center - radius * Math.cos(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    return { d, color: seg.color, label: seg.label, value: seg.value };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}
        <circle cx={center} cy={center} r={radius * 0.6} fill="white" />
        <text x={center} y={center + 5} textAnchor="middle" className="text-xs font-black fill-gray-800">
          {total}
        </text>
        <text x={center} y={center + 20} textAnchor="middle" className="text-[8px] fill-gray-400">
          Orders
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-bold text-gray-800">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
export default function ProductionReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const router = useRouter();

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

  // ─── Filtering ────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== "all") {
      if (filterStatus === "planned" && getOrderField(o, 'transferQty', 'transferqty') > 0) return false;
      if (filterStatus === "inprogress" && getOrderField(o, 'transferQty', 'transferqty') === 0) return false;
      if (filterStatus === "completed" && getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty') < (o.quantity || 0)) return false;
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

  // ─── Aggregations ────────────────────────────────────────────
  const totalOrders = filteredOrders.length;
  const totalQty = filteredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const totalTransfer = filteredOrders.reduce((sum, o) => sum + getOrderField(o, 'transferQty', 'transferqty'), 0);
  const totalIssue = filteredOrders.reduce((sum, o) => sum + getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty'), 0);
  const totalReceipt = filteredOrders.reduce((sum, o) => sum + getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty'), 0);

  const completionRate = totalQty > 0 ? (totalReceipt / totalQty) * 100 : 0;
  const avgProgress = filteredOrders.reduce((sum, o) => {
    const qty = o.quantity || 0;
    const rec = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');
    return sum + (qty > 0 ? rec / qty : 0);
  }, 0) / (totalOrders || 1) * 100;

  const plannedOrders = filteredOrders.filter((o) => getOrderField(o, 'transferQty', 'transferqty') === 0).length;
  const inProgressOrders = filteredOrders.filter((o) => 
    getOrderField(o, 'transferQty', 'transferqty') > 0 && 
    getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty') < (o.quantity || 0)
  ).length;
  const completedOrders = filteredOrders.filter((o) => 
    getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty') >= (o.quantity || 0)
  ).length;

  const donutSegments = [
    { label: "Planned", value: plannedOrders, color: "#9CA3AF" },
    { label: "In Progress", value: inProgressOrders, color: "#F59E0B" },
    { label: "Completed", value: completedOrders, color: "#10B981" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Production Flow Report
            </h1>
            <p className="text-sm text-gray-400">
              Comprehensive overview of your manufacturing pipeline
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProductionReportExportActions title="Production Flow Report" tableId="production-flow-report-table" />
            <button
              onClick={fetchOrders}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
            >
              ⟳ Refresh
            </button>
            <button
              onClick={() => router.push("/admin/productionorders-list-view")}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
            >
              ← Back to Orders
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              >
                <option value="all">All</option>
                <option value="planned">Planned</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilterStatus("all"); setStartDate(""); setEndDate(""); }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats – 2 rows */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Orders" value={totalOrders} icon={<FaIndustry className="text-indigo-500" />} color="indigo" />
          <StatCard label="Total Qty" value={totalQty} icon={<FaChartBar className="text-indigo-500" />} color="indigo" />
          <StatCard label="Transferred" value={totalTransfer} icon={<FaTruck className="text-amber-500" />} color="amber" />
          <StatCard label="Issued" value={totalIssue} icon={<FaTools className="text-blue-500" />} color="blue" />
          <StatCard label="Received" value={totalReceipt} icon={<FaCheckCircle className="text-emerald-500" />} color="emerald" />
          <StatCard label="Completion Rate" value={completionRate.toFixed(1)} suffix="%" icon={<FaPercentage className="text-green-500" />} color="emerald" />
        </div>

        {/* Advanced Metrics & Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SectionCard icon={FaChartBar} title="Overall Progress" subtitle="Average completion across all orders" color="indigo">
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-black text-gray-900">{avgProgress.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Average Progress</p>
                  </div>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, avgProgress)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <p className="text-2xl font-black text-amber-600">{plannedOrders}</p>
                    <p className="text-[10px] font-bold uppercase text-amber-500">Planned</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-black text-blue-600">{inProgressOrders}</p>
                    <p className="text-[10px] font-bold uppercase text-blue-500">In Progress</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-xl">
                    <p className="text-2xl font-black text-emerald-600">{completedOrders}</p>
                    <p className="text-[10px] font-bold uppercase text-emerald-500">Completed</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
          <div className="flex items-center justify-center bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <DonutChart segments={donutSegments} size={160} strokeWidth={25} />
          </div>
        </div>

        {/* Detailed Table with Progress Bars */}
        <SectionCard icon={FaChartBar} title="Order Flow Details" subtitle="Each order's progress through Transfer → Issue → Receipt" color="indigo">
          {filteredOrders.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No orders match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table id="production-flow-report-table" className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Order ID</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Product</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400 w-20">Planned</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400 min-w-[220px]">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((o) => {
                    const qty = o.quantity || 0;
                    const transfer = getOrderField(o, 'transferQty', 'transferqty');
                    const issue = getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty');
                    const receipt = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');

                    return (
                      <tr key={o._id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {o.productionDocNo || o.orderNumber || "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {typeof o.productDesc === "string" ? o.productDesc : "BOM Product"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-gray-900">{qty}</td>
                        <td className="px-4 py-3 space-y-1.5">
                          <ProgressBar 
                            current={transfer} 
                            total={qty} 
                            label="Transfer" 
                            icon={FaTruck} 
                            color="amber" 
                          />
                          <ProgressBar 
                            current={issue} 
                            total={qty} 
                            label="Issue" 
                            icon={FaTools} 
                            color="blue" 
                          />
                          <ProgressBar 
                            current={receipt} 
                            total={qty} 
                            label="Receipt" 
                            icon={FaCheckCircle} 
                            color="emerald" 
                          />
                        </td>
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
