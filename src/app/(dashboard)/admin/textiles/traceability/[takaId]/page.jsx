"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import {
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaClock,
  FaBox,
  FaTruck,
  FaIndustry,
  FaFlask,
  FaQrcode,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function TraceabilityPage() {
  const { takaId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/textiles/traceability/${takaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data.data);
      } catch {
        toast.error("Failed to load traceability data");
      } finally {
        setLoading(false);
      }
    };
    if (takaId) fetchData();
  }, [takaId]);

  if (loading) {
    return (
      <div className="p-6 bg-[#f2f5f9] min-h-screen">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-[#f2f5f9] min-h-screen">
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-700">Taka not found</h3>
          <p className="text-gray-400 mt-2">The Taka you're looking for doesn't exist.</p>
          <Link
            href="/admin/textiles/takas"
            className="inline-block mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            Back to Takas
          </Link>
        </div>
      </div>
    );
  }

  const { taka, timeline, summary, productionOrder, lot, bom, routing, challans, receipts, inspections } = data;

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <FaCheck className="text-green-600" size={14} />;
      case "failed":
        return <FaTimes className="text-red-600" size={14} />;
      case "pending":
        return <FaClock className="text-amber-600" size={14} />;
      default:
        return <FaClock className="text-gray-400" size={14} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "border-green-500 bg-green-50";
      case "failed":
        return "border-red-500 bg-red-50";
      case "pending":
        return "border-amber-500 bg-amber-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/textiles/takas"
            className="p-2 bg-white rounded-xl shadow hover:bg-gray-50"
          >
            <FaArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              Traceability: <span className="text-indigo-600">{taka.takaNumber}</span>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  taka.status === "available"
                    ? "bg-green-100 text-green-700"
                    : taka.status === "job-work"
                    ? "bg-yellow-100 text-yellow-700"
                    : taka.status === "qc"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {taka.status}
              </span>
            </h1>
            <p className="text-sm text-gray-500">
              {taka.fabric?.itemName} • {taka.quantity} Mtr • {taka.shade?.name || "No shade"}
            </p>
          </div>
        </div>
        {taka.qrCode && (
          <div className="bg-white p-2 rounded-xl shadow border border-gray-100">
            <img src={taka.qrCode} alt="QR Code" className="w-16 h-16" />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Total Challan Qty</p>
          <p className="text-xl font-bold text-gray-800">{summary.totalChallanQty?.toFixed(0) || 0} Mtr</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Total Received Qty</p>
          <p className="text-xl font-bold text-gray-800">{summary.totalReceivedQty?.toFixed(0) || 0} Mtr</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">QC Inspections</p>
          <p className="text-xl font-bold text-gray-800">{summary.totalInspections}</p>
          <p className="text-xs text-gray-400">
            ✅ {summary.passCount} Pass • ❌ {summary.failCount} Fail
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Job Work</p>
          <p className="text-xl font-bold text-gray-800">{summary.totalChallans}</p>
          <p className="text-xs text-gray-400">Challans sent</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <FaClock size={16} /> Timeline
            </h3>
            <div className="space-y-0">
              {timeline.map((item, idx) => (
                <div key={idx} className="relative pl-8 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {idx < timeline.length - 1 && (
                    <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${getStatusColor(item.status)} flex items-center justify-center`}>
                    {getStatusIcon(item.status)}
                  </div>
                  {/* Content */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-bold text-gray-800">{item.stage}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.details}</p>
                      {item.link && (
                        <Link
                          href={item.link}
                          className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                        >
                          View Details →
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(item.date).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Taka Details */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-700 mb-2">Taka Details</h4>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Number:</span> {taka.takaNumber}</p>
              <p><span className="text-gray-500">Fabric:</span> {taka.fabric?.itemName}</p>
              <p><span className="text-gray-500">Quantity:</span> {taka.quantity} Mtr</p>
              <p><span className="text-gray-500">Weight:</span> {taka.weight || "—"} Kg</p>
              <p><span className="text-gray-500">Width:</span> {taka.width || "—"} cm</p>
              <p><span className="text-gray-500">Shade:</span> {taka.shade?.name || "—"}</p>
              <p><span className="text-gray-500">Warehouse:</span> {taka.warehouse?.name || "—"}</p>
              <p><span className="text-gray-500">Location:</span> {taka.location || "—"}</p>
              <p><span className="text-gray-500">Design:</span> {taka.design || "—"}</p>
            </div>
          </div>

          {/* Production Order */}
          {productionOrder && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaIndustry size={14} /> Production Order
              </h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Order #:</span> {productionOrder.orderNumber}</p>
                <p><span className="text-gray-500">Item:</span> {productionOrder.item?.itemName}</p>
                <p><span className="text-gray-500">Qty:</span> {productionOrder.quantity} {productionOrder.unit}</p>
                {productionOrder.customer && (
                  <p><span className="text-gray-500">Customer:</span> {productionOrder.customer.name}</p>
                )}
              </div>
            </div>
          )}

          {/* Lot */}
          {lot && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaBox size={14} /> Lot
              </h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Lot #:</span> {lot.lotNumber}</p>
                <p><span className="text-gray-500">Product:</span> {lot.product?.itemName}</p>
                <p><span className="text-gray-500">Supplier:</span> {lot.supplier?.name || "—"}</p>
                <p><span className="text-gray-500">Qty:</span> {lot.quantity} {lot.unit}</p>
              </div>
            </div>
          )}

          {/* BOM */}
          {bom && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaFlask size={14} /> BOM
              </h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Code:</span> {bom.bomCode}</p>
                <p><span className="text-gray-500">Components:</span> {bom.components?.length || 0}</p>
                <p><span className="text-gray-500">Waste %:</span> {bom.wastePercent || 0}%</p>
                <p><span className="text-gray-500">Shade:</span> {bom.shade?.name || "—"}</p>
              </div>
            </div>
          )}

          {/* Job Work Summary */}
          {challans.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaTruck size={14} /> Job Work
              </h4>
              <div className="space-y-2 text-sm">
                {challans.map((c) => (
                  <div key={c._id} className="border-b border-gray-50 pb-2 last:border-0">
                    <Link
                      href={`/admin/textiles/job-work/challans/${c._id}`}
                      className="text-indigo-600 hover:underline text-xs font-medium"
                    >
                      {c.challanNumber}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {c.vendor?.name} • {c.items.find(i => i.taka?._id?.toString() === takaId)?.quantity || 0} Mtr
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QC Summary */}
          {inspections.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                🔬 QC Inspections
              </h4>
              <div className="space-y-2 text-sm">
                {inspections.map((q) => (
                  <div key={q._id} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                    <div>
                      <Link
                        href={`/admin/textiles/quality-inspection/${q._id}`}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        {q.inspectionNumber}
                      </Link>
                      <p className="text-xs text-gray-500">Grade: {q.grade}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      q.finalResult === "pass" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {q.finalResult}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}