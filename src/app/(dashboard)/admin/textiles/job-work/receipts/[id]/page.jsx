"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { FaArrowLeft, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

export default function ViewJobWorkReceipt() {
  const { id } = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/textiles/job-work-receipts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReceipt(res.data.data);
      } catch {
        toast.error("Failed to load receipt");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this receipt?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/job-work-receipts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      router.push("/admin/textiles/job-work/receipts");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!receipt) return <div className="p-6 text-center text-red-500">Not found</div>;

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link
          href="/admin/textiles/job-work/receipts"
          className="p-2 bg-white rounded-xl shadow hover:bg-gray-50"
        >
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Receipt: {receipt.receiptNumber}
        </h1>
        <div className="ml-auto flex flex-wrap gap-2">
          {receipt.status !== "qc" && (
            <>
              <Link href={`/admin/textiles/job-work/receipts/${id}/edit`} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"><FaEdit size={14} /> Edit</Link>
              <button onClick={handleDelete} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"><FaTrash size={14} /> Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">Receipt Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-gray-500">Receipt Number</span>
                <p className="font-mono font-bold text-emerald-600">{receipt.receiptNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p>
                  <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    receipt.status === "received" ? "bg-blue-100 text-blue-700" :
                    receipt.status === "qc" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {receipt.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Challan</span>
                <p><Link href={`/admin/textiles/job-work/challans/${receipt.challan?._id}`} className="font-semibold text-emerald-600 hover:underline">{receipt.challan?.challanNumber || "—"}</Link></p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Vendor</span>
                <p className="font-medium">{receipt.vendor?.supplierName || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Total Challan Qty</span>
                <p>{receipt.totalChallanQty} Mtr</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Total Received Qty</span>
                <p className="font-bold">{receipt.totalReceivedQty} Mtr</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Shrinkage</span>
                <p className={`font-bold ${receipt.commercialShrinkagePercent > 5 ? "text-red-500" : ""}`}>
                  {receipt.commercialShrinkageMeter} Mtr ({receipt.commercialShrinkagePercent?.toFixed(2)}%)
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Process Loss</span>
                <p>{receipt.processLoss} Mtr</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Wastage</span>
                <p>{receipt.wastage} Mtr</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Shortage</span>
                <p>{receipt.shortage} Mtr</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-gray-500">Reason</span>
                <p className="text-gray-600">{receipt.reason || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Lot Complete</span>
                <p>{receipt.lotComplete ? "✅ Yes" : "❌ No"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Received Date</span>
                <p>{new Date(receipt.receivedDate).toLocaleDateString()}</p>
              </div>
              {receipt.receivedBy && (
                <div>
                  <span className="text-sm text-gray-500">Received By</span>
                  <p>{receipt.receivedBy?.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">
              Takas ({receipt.items?.length || 0})
            </h3>
            {receipt.items?.length === 0 ? (
              <p className="text-gray-400 text-sm">No items in this receipt</p>
            ) : (
              <div className="space-y-3">
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="font-mono font-bold text-emerald-600 text-sm">
                      {item.taka?.takaNumber || "Taka"}
                    </div>
                    <div className="text-xs text-gray-600">
                      Challan: {item.challanQuantity} Mtr
                    </div>
                    <div className="text-xs text-gray-600">
                      Received: {item.receivedQuantity} Mtr
                    </div>
                    {item.actualMeters && (
                      <div className="text-xs text-gray-600">
                        Actual: {item.actualMeters} Mtr
                      </div>
                    )}
                    {item.lumpNo && (
                      <div className="text-xs text-gray-400">Lump: {item.lumpNo}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
