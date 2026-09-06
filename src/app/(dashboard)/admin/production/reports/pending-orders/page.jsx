"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaClipboardList, FaArrowLeft, FaExclamationTriangle } from "react-icons/fa";
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

export default function PendingOrders() {
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

  // Filter: orders where receiptForProductionQty < quantity
  const pending = orders.filter((o) => {
    const received = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');
    return received < (o.quantity || 0);
  });
  pending.sort((a, b) => (a.quantity - getOrderField(a, 'receiptForProductionQty', 'reciptforproductionqty')) - (b.quantity - getOrderField(b, 'receiptForProductionQty', 'reciptforproductionqty')));

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Pending Orders</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <FaExclamationTriangle />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400">Pending Orders</p>
              <p className="text-xl font-bold text-gray-900">{pending.length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FaClipboardList />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400">Total Orders</p>
              <p className="text-xl font-bold text-gray-900">{orders.length}</p>
            </div>
          </div>
        </div>

        <SectionCard icon={<FaClipboardList />} title="Incomplete Orders" color="red">
          {pending.length === 0 ? (
            <p className="text-center text-emerald-600 font-bold py-6">🎉 All orders are completed!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Order</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Product</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Planned</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Received</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pending.map((o) => {
                    const qty = o.quantity || 0;
                    const received = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');
                    const remaining = qty - received;
                    return (
                      <tr key={o._id} className="hover:bg-red-50/20">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-red-600">
                          {o.productionDocNo || o.orderNumber || "Draft"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {typeof o.productDesc === "string" ? o.productDesc : "BOM Product"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{qty}</td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-600">{received}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-red-600">{remaining}</td>
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
