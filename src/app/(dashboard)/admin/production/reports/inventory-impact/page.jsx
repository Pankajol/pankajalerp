"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBox, FaArrowLeft, FaChartBar, FaMinus, FaPlus } from "react-icons/fa";
import { useRouter } from "next/navigation";

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

export default function InventoryImpact() {
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

  // Aggregate item consumption (OUT) and receipt (IN) per item
  const itemImpact = {};
  orders.forEach((o) => {
    // Consumption: items used
    (o.items || []).forEach((item) => {
      const id = item.item?._id || item.item;
      if (!id) return;
      const key = id.toString();
      if (!itemImpact[key]) {
        itemImpact[key] = {
          name: item.itemName || item.item?.itemName || "Unknown",
          consumed: 0,
          received: 0,
        };
      }
      itemImpact[key].consumed += item.quantity || 0;
    });
    // Receipt: finished goods received (only if BOM product is known)
    // We approximate that the BOM product's item ID is the productNo._id
    // but we don't have that reliably, so we skip for now.
    // We'll just show consumption.
  });

  const itemList = Object.values(itemImpact).sort((a, b) => b.consumed - a.consumed);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Inventory Impact</h1>
          <p className="text-sm text-gray-400">Materials consumed by production orders</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatCard label="Total Items Consumed" value={itemList.reduce((s, i) => s + i.consumed, 0)} icon={<FaMinus />} color="red" />
          <StatCard label="Unique Items" value={itemList.length} icon={<FaBox />} color="indigo" />
        </div>

        <SectionCard icon={<FaBox />} title="Consumption by Item" color="amber">
          {itemList.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No items consumed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Item</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Consumed Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {itemList.map((i, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-red-600">{i.consumed}</td>
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
