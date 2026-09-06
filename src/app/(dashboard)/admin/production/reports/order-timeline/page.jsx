"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaClock, FaArrowLeft, FaCheckCircle, FaHourglassHalf } from "react-icons/fa";
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

export default function OrderTimeline() {
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

  // For each order, compute days in each stage (we approximate based on quantity progression)
  // Since we don't have timestamps, we'll use the dates on the order.
  const timelineData = orders.map((o) => {
    const created = new Date(o.createdAt);
    const updated = new Date(o.updatedAt);
    const totalDays = Math.max(1, Math.ceil((updated - created) / (1000 * 60 * 60 * 24)));
    const qty = o.quantity || 0;
    const transferred = getOrderField(o, 'transferQty', 'transferqty');
    const issued = getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty');
    const received = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');

    // Estimate time spent in each stage based on progress (rough approximation)
    const transferPct = qty > 0 ? transferred / qty : 0;
    const issuePct = qty > 0 ? issued / qty : 0;
    const receiptPct = qty > 0 ? received / qty : 0;

    // Assume stages: transfer, issue, receipt. We'll use percentages.
    // For simplicity, we'll set days per stage proportionally.
    const transferDays = Math.round(totalDays * transferPct);
    const issueDays = Math.round(totalDays * (issuePct - transferPct));
    const receiptDays = Math.round(totalDays * (receiptPct - issuePct));
    // remaining days are idle / waiting.
    const idleDays = totalDays - transferDays - issueDays - receiptDays;

    return {
      ...o,
      totalDays,
      transferDays: Math.max(0, transferDays),
      issueDays: Math.max(0, issueDays),
      receiptDays: Math.max(0, receiptDays),
      idleDays: Math.max(0, idleDays),
    };
  });

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Order Status Timeline</h1>
        </div>

        <SectionCard icon={<FaClock />} title="Time Spent per Stage" color="blue">
          {timelineData.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No orders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Order</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Total Days</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Transfer (days)</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Issue (days)</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Receipt (days)</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Idle (days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {timelineData.map((o) => (
                    <tr key={o._id} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">
                        {o.productionDocNo || o.orderNumber || "Draft"}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{o.totalDays}</td>
                      <td className="px-4 py-3 text-center font-mono text-amber-600">{o.transferDays}</td>
                      <td className="px-4 py-3 text-center font-mono text-blue-600">{o.issueDays}</td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600">{o.receiptDays}</td>
                      <td className="px-4 py-3 text-center font-mono text-gray-400">{o.idleDays}</td>
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
