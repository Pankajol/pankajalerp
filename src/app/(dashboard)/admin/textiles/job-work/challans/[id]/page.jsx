"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { FaArrowLeft, FaEdit, FaTruck, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

export default function ViewJobWorkChallan() {
  const { id } = useParams();
  const router = useRouter();
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/textiles/job-work-challans/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChallan(res.data.data);
      } catch {
        toast.error("Failed to load challan");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleIssue = async () => {
    if (!confirm("Issue this challan to vendor?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await api.patch(
        `/textiles/job-work-challans/${id}/issue`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChallan((current) => ({
        ...current,
        status: response.data.data.status,
        issuedAt: response.data.data.issuedAt,
      }));
      toast.success("Challan issued!");
      router.refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Issue failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this challan?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/job-work-challans/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      router.push("/admin/textiles/job-work/challans");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!challan) return <div className="p-6 text-center text-red-500">Not found</div>;

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link
          href="/admin/textiles/job-work/challans"
          className="p-2 bg-white rounded-xl shadow hover:bg-gray-50"
        >
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Challan: {challan.challanNumber}
        </h1>
        <div className="ml-auto flex flex-wrap gap-2">
          {challan.status === "issued" && (
            <Link href={`/admin/textiles/job-work/receipts/new?challanId=${id}`} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Receive Fabric</Link>
          )}
          {challan.linkedReceipt && (
            <Link href={`/admin/textiles/job-work/receipts/${challan.linkedReceipt._id}`} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">View Receipt</Link>
          )}
          {challan.status === "draft" && (
            <>
              <Link
                href={`/admin/textiles/job-work/challans/${id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
              >
                <FaEdit size={14} /> Edit
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
              >
                <FaTrash size={14} /> Delete
              </button>
              <button
                onClick={handleIssue}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700"
              >
                <FaTruck size={14} /> Issue to Vendor
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">Challan Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-gray-500">Challan Number</span>
                <p className="font-mono font-bold text-indigo-600">{challan.challanNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p>
                  <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    challan.status === "issued" ? "bg-blue-100 text-blue-700" :
                    challan.status === "completed" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {challan.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Request</span>
                <p><Link href={`/admin/textiles/job-work/requests/${challan.request?._id}`} className="font-semibold text-indigo-600 hover:underline">{challan.request?.requestNumber || "—"}</Link></p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Process</span>
                <p>{challan.process}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Vendor</span>
                <p className="font-medium">{challan.vendor?.supplierName || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Total Quantity</span>
                <p className="font-bold">{challan.totalQuantity} Mtr</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Issued Date</span>
                <p>{new Date(challan.issuedDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Expected Return</span>
                <p>{challan.expectedReturnDate ? new Date(challan.expectedReturnDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Transport</span>
                <p>{challan.transport || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Vehicle No.</span>
                <p>{challan.vehicleNo || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Driver</span>
                <p>{challan.driverName || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Vendor Challan</span>
                <p>{challan.vendorChallanNo || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-gray-500">Notes</span>
                <p className="text-gray-600">{challan.notes || "—"}</p>
              </div>
              {challan.issuedBy && (
                <div>
                  <span className="text-sm text-gray-500">Issued By</span>
                  <p>{challan.issuedBy?.name}</p>
                </div>
              )}
              {challan.issuedAt && (
                <div>
                  <span className="text-sm text-gray-500">Issued At</span>
                  <p>{new Date(challan.issuedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">
              Takas ({challan.items?.length || 0})
            </h3>
            {challan.items?.length === 0 ? (
              <p className="text-gray-400 text-sm">No items in this challan</p>
            ) : (
              <div className="space-y-3">
                {challan.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="font-mono font-bold text-indigo-600 text-sm">
                      {item.taka?.takaNumber || "Taka"}
                    </div>
                    <div className="text-xs text-gray-600">
                      Qty: {item.quantity} Mtr
                    </div>
                    {item.actualMeters && (
                      <div className="text-xs text-gray-600">
                        Actual: {item.actualMeters} Mtr
                      </div>
                    )}
                    {item.weight && (
                      <div className="text-xs text-gray-600">
                        Weight: {item.weight} kg
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-gray-400">{item.notes}</div>
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
