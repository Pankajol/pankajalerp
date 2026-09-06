"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBoxes, FaChartBar, FaArrowLeft, FaIndustry } from "react-icons/fa";
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

const StatCard = ({ label, value, icon, color = "indigo" }) => {
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
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default function BOMUsageReport() {
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

  // Group by BOM (using bomId._id or bomId)
  const bomMap = orders.reduce((acc, o) => {
    const bomId = o.bomId?._id || o.bomId;
    if (!bomId) return acc;
    const key = bomId.toString();
    if (!acc[key]) {
      acc[key] = {
        bomId,
        // Use order's productDesc if BOM is not populated, else fallback to BOM's productDesc
        productDesc: o.bomId?.productDesc || o.productDesc || "Unknown BOM",
        totalQty: 0,
        totalOrders: 0,
        totalTransferred: 0,
        totalIssued: 0,
        totalReceived: 0,
        totalAmount: 0,
        avgCost: 0,
      };
    }
    const entry = acc[key];
    entry.totalQty += o.quantity || 0;
    entry.totalOrders += 1;
    entry.totalTransferred += getOrderField(o, 'transferQty', 'transferqty');
    entry.totalIssued += getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty');
    entry.totalReceived += getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');
    // amount: use rate (avg cost per unit) * quantity
    entry.totalAmount += (o.rate || 0) * (o.quantity || 0);
    return acc;
  }, {});

  const bomList = Object.values(bomMap).map(b => ({
    ...b,
    avgCost: b.totalQty > 0 ? b.totalAmount / b.totalQty : 0,
    completionPct: b.totalQty > 0 ? (b.totalReceived / b.totalQty) * 100 : 0,
  }));
  bomList.sort((a, b) => b.totalQty - a.totalQty);

  const totalBOMs = bomList.length;
  const totalQtyAll = bomList.reduce((s, b) => s + b.totalQty, 0);
  const totalOrdersAll = bomList.reduce((s, b) => s + b.totalOrders, 0);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">BOM Usage Report</h1>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Unique BOMs" value={totalBOMs} icon={<FaBoxes />} color="indigo" />
          <StatCard label="Total Production Qty" value={totalQtyAll} icon={<FaChartBar />} color="emerald" />
          <StatCard label="Total Orders" value={totalOrdersAll} icon={<FaIndustry />} color="amber" />
        </div>

        {/* Table */}
        <SectionCard icon={<FaBoxes />} title="BOM Usage Breakdown" color="emerald">
          {bomList.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No BOMs found in orders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">BOM</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Orders</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Total Qty</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Transferred</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Issued</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Received</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Avg Cost/Unit</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bomList.map((b) => (
                    <tr key={b.bomId} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.productDesc}</td>
                      <td className="px-4 py-3 text-center">{b.totalOrders}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{b.totalQty}</td>
                      <td className="px-4 py-3 text-center font-mono text-amber-600">{b.totalTransferred}</td>
                      <td className="px-4 py-3 text-center font-mono text-blue-600">{b.totalIssued}</td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600">{b.totalReceived}</td>
                      <td className="px-4 py-3 text-center font-mono">₹{b.avgCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, b.completionPct)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">{Math.round(b.completionPct)}%</span>
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
