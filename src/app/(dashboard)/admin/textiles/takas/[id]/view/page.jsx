"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { FaArrowLeft, FaEdit, FaQrcode } from "react-icons/fa";
import { toast } from "react-toastify";

export default function ViewTaka() {
  const { id } = useParams();
  const [taka, setTaka] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [takaRes, histRes] = await Promise.all([
          api.get(`/textiles/takas/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/textiles/takas/${id}/history`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setTaka(takaRes.data.data);
        setHistory(histRes.data.data?.history || []);
      } catch {
        toast.error("Failed to load Taka");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!taka) return <div className="p-6 text-center text-red-500">Taka not found</div>;

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/textiles/takas" className="p-2 bg-white rounded-xl shadow hover:bg-gray-50">
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">Taka Details</h1>
        <Link href={`/admin/textiles/takas/${id}/edit`} className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
          <FaEdit size={14} /> Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-gray-500">Taka Number</span><p className="font-mono font-bold text-indigo-600">{taka.takaNumber}</p></div>
              <div><span className="text-sm text-gray-500">Status</span><p><span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${taka.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{taka.status}</span></p></div>
              <div><span className="text-sm text-gray-500">Production Order</span><p>{taka.productionOrder?.orderNumber}</p></div>
              <div><span className="text-sm text-gray-500">Lot</span><p>{taka.lot?.lotNumber || "—"}</p></div>
              <div><span className="text-sm text-gray-500">Fabric</span><p>{taka.fabric?.itemName}</p></div>
              <div><span className="text-sm text-gray-500">Design</span><p>{taka.design || "—"}</p></div>
              <div><span className="text-sm text-gray-500">Shade</span><p>{taka.shade?.name || "—"}</p></div>
              <div><span className="text-sm text-gray-500">Quantity</span><p className="font-bold">{taka.quantity} Mtr</p></div>
              <div><span className="text-sm text-gray-500">Weight</span><p>{taka.weight || "—"} Kg</p></div>
              <div><span className="text-sm text-gray-500">Width</span><p>{taka.width || "—"} {taka.unit || "cm"}</p></div>
              <div><span className="text-sm text-gray-500">Warehouse</span><p>{taka.warehouse?.name || "—"}</p></div>
              <div><span className="text-sm text-gray-500">Location</span><p>{taka.location || "—"}</p></div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">History Timeline</h3>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm">No history yet</p>
            ) : (
              <div className="space-y-4">
                {history.map((item, idx) => (
                  <div key={idx} className="flex gap-4 border-b border-gray-50 pb-3">
                    <div className="w-2/6 text-xs text-gray-400">{new Date(item.date).toLocaleString()}</div>
                    <div className="w-1/6">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{item.event}</span>
                    </div>
                    <div className="w-3/6 text-sm text-gray-700">{item.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: QR Code */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <h3 className="font-bold text-gray-700 mb-4">QR Code</h3>
            {taka.qrCode ? (
              <Image src={taka.qrCode} width={200} height={200} alt="QR Code" className="mx-auto" />
            ) : (
              <p className="text-gray-400">No QR generated</p>
            )}
            <p className="text-xs text-gray-400 mt-2">Scan to view Taka details</p>
          </div>
        </div>
      </div>
    </div>
  );
}