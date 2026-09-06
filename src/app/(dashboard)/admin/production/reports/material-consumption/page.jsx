"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBox, FaClipboardList, FaArrowLeft, FaRupeeSign } from "react-icons/fa";
import { useRouter } from "next/navigation";

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

export default function MaterialConsumptionReport() {
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

  // Aggregate items
  const itemMap = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const id = item.item?._id || item.item;
      if (!id) return;
      const key = id.toString();
      if (!itemMap[key]) {
        itemMap[key] = {
          name: item.itemName || item.item?.itemName || "Unknown",
          code: item.itemCode || item.item?.itemCode || "",
          totalQty: 0,
          totalCost: 0,
          orderCount: 0,
        };
      }
      const qty = item.quantity || 0;
      const price = item.unitPrice || item.item?.unitPrice || 0;
      itemMap[key].totalQty += qty;
      itemMap[key].totalCost += qty * price;
      itemMap[key].orderCount += 1;
    });
    // Also resources
    (o.resources || []).forEach((res) => {
      const id = res.resource?._id || res.resource || res.item?._id || res.item;
      if (!id) return;
      const key = id.toString();
      if (!itemMap[key]) {
        itemMap[key] = {
          name: res.name || res.resource?.name || res.item?.name || "Unknown Resource",
          code: res.code || res.resource?.code || res.item?.code || "",
          totalQty: 0,
          totalCost: 0,
          orderCount: 0,
        };
      }
      const qty = res.quantity || 0;
      const price = res.unitPrice || 0;
      itemMap[key].totalQty += qty;
      itemMap[key].totalCost += qty * price;
      itemMap[key].orderCount += 1;
    });
  });

  const materialList = Object.values(itemMap).sort((a, b) => b.totalQty - a.totalQty);
  const totalMaterials = materialList.length;
  const totalConsumptionQty = materialList.reduce((s, m) => s + m.totalQty, 0);
  const totalCost = materialList.reduce((s, m) => s + m.totalCost, 0);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Material Consumption Report</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Unique Materials" value={totalMaterials} icon={<FaBox />} color="indigo" />
          <StatCard label="Total Consumption Qty" value={totalConsumptionQty} icon={<FaClipboardList />} color="amber" />
          <StatCard label="Total Cost" value={`₹${totalCost.toFixed(0)}`} icon={<FaRupeeSign />} color="emerald" />
        </div>

        <SectionCard icon={<FaBox />} title="Material Consumption Breakdown" color="amber">
          {materialList.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No materials found in any order.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Material</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Code</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Total Qty</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Orders</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {materialList.map((m, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.code || "—"}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{m.totalQty}</td>
                      <td className="px-4 py-3 text-center">{m.orderCount}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">₹{m.totalCost.toFixed(2)}</td>
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
