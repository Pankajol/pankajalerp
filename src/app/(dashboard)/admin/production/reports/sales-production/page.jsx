"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaClipboardList,
  FaChartBar,
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

export default function SalesProductionReport() {
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

  // Filter orders that have sales orders linked
  const ordersWithSales = orders.filter(o => o.salesOrder && o.salesOrder.length > 0);
  const totalLinked = ordersWithSales.length;
  const totalQtyOrdered = ordersWithSales.reduce((s, o) => s + (o.quantity || 0), 0);
  const totalReceived = ordersWithSales.reduce((s, o) => s + getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty'), 0);
  const fulfilmentRate = totalQtyOrdered > 0 ? (totalReceived / totalQtyOrdered) * 100 : 0;

  // Per order fulfilment
  const orderFulfilment = ordersWithSales.map((o) => ({
    ...o,
    orderedQty: o.quantity || 0,
    receivedQty: getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty'),
    salesOrderRefs: o.salesOrder.map(so => typeof so === 'object' ? so.orderNumber || so._id : so),
  }));

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Sales Order vs Production</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Linked Orders" value={totalLinked} icon={<FaClipboardList />} color="indigo" />
          <StatCard label="Total Ordered Qty" value={totalQtyOrdered} icon={<FaChartBar />} color="amber" />
          <StatCard label="Received Qty" value={totalReceived} icon={<FaCheckCircle />} color="emerald" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400">Overall Fulfilment Rate</p>
              <p className="text-2xl font-black text-gray-900">{fulfilmentRate.toFixed(1)}%</p>
            </div>
            <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" style={{ width: `${Math.min(100, fulfilmentRate)}%` }} />
            </div>
          </div>
        </div>

        <SectionCard icon={<FaClipboardList />} title="Order‑Level Fulfilment" color="blue">
          {orderFulfilment.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No orders linked to sales orders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Production Order</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Sales Order(s)</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Ordered Qty</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Received Qty</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Fulfilment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orderFulfilment.map((o) => {
                    const pct = o.orderedQty > 0 ? (o.receivedQty / o.orderedQty) * 100 : 0;
                    const status = pct >= 100 ? "Completed" : pct > 0 ? "Partial" : "Pending";
                    const color = status === "Completed" ? "text-emerald-600 bg-emerald-50" : status === "Partial" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
                    return (
                      <tr key={o._id} className="hover:bg-indigo-50/20">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">
                          {o.productionDocNo || o.orderNumber || "Draft"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {o.salesOrderRefs.join(', ')}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{o.orderedQty}</td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-600">{o.receivedQty}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${color}`}>
                            {status} ({Math.round(pct)}%)
                          </span>
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
