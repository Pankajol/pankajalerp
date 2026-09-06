"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import {
  FaArrowLeft,
  FaEdit,
  FaCheck,
  FaTimes,
  FaTrash,
  FaPaperPlane,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ViewJobWorkRequest() {
  const { id } = useParams();
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/textiles/job-work-requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequest(res.data.data);
      } catch {
        toast.error("Failed to load request");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleApprove = async () => {
    if (!confirm("Approve this request?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        `/textiles/job-work-requests/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequest((current) => ({
        ...current,
        status: response.data.data.status,
        approvedAt: response.data.data.approvedAt,
      }));
      toast.success("Request approved");
      router.refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Approval failed");
    }
  };

  const handleSubmit = async () => {
    if (!confirm("Submit this request for approval?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(`/textiles/job-work-requests/${id}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequest((current) => ({ ...current, status: response.data.data.status }));
      toast.success("Request submitted for approval");
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed");
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Enter cancellation reason:");
    if (reason === null) return;
    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        `/textiles/job-work-requests/${id}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequest((current) => ({
        ...current,
        status: response.data.data.status,
        cancelledAt: response.data.data.cancelledAt,
        cancellationReason: response.data.data.cancellationReason,
      }));
      toast.success("Request cancelled");
      router.refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cancel failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this request?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/job-work-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      router.push("/admin/textiles/job-work/requests");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!request) return <div className="p-6 text-center text-red-500">Not found</div>;

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link
          href="/admin/textiles/job-work/requests"
          className="p-2 bg-white rounded-xl shadow hover:bg-gray-50"
        >
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Job Work Request: {request.requestNumber}
        </h1>
        <div className="ml-auto flex flex-wrap gap-2">
          {request.status === "draft" && (
            <>
              <Link
                href={`/admin/textiles/job-work/requests/${id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
              >
                <FaEdit size={14} /> Edit
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
              >
                <FaTrash size={14} /> Delete
              </button>
              <button onClick={handleSubmit} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><FaPaperPlane size={14} /> Submit</button>
            </>
          )}
          {request.status === "submitted" && (
            <>
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700"
              >
                <FaCheck size={14} /> Approve
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
              >
                <FaTimes size={14} /> Cancel
              </button>
            </>
          )}
          {request.status === "approved" && (
            <>
              {request.linkedChallan ? (
                <Link href={`/admin/textiles/job-work/challans/${request.linkedChallan._id}`} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">View Challan</Link>
              ) : (
                <Link href={`/admin/textiles/job-work/challans/new?requestId=${id}`} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Create Challan</Link>
              )}
              {!request.linkedChallan && <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"><FaTimes size={14} /> Cancel</button>}
            </>
          )}
          {["in-progress", "completed"].includes(request.status) && request.linkedChallan && (
            <Link href={`/admin/textiles/job-work/challans/${request.linkedChallan._id}`} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">View Challan</Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">Request Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-gray-500">Request Number</span>
                <p className="font-mono font-bold text-blue-600">
                  {request.requestNumber}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p>
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      request.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : request.status === "in-progress"
                        ? "bg-indigo-100 text-indigo-700"
                        : request.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : request.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : request.status === "submitted"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {request.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Vendor</span>
                <p className="font-medium">{request.vendor?.supplierName || "—"}</p>
                <p className="text-xs text-gray-400">{request.vendor?.emailId}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Process</span>
                <p className="font-medium">{request.process}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Design Code</span>
                <p>{request.designCode || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Customer</span>
                <p>{request.customerName || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Delivery Design</span>
                <p>{request.deliveryDesign || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Delivery Date</span>
                <p>
                  {request.deliveryDate
                    ? new Date(request.deliveryDate).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-gray-500">Notes</span>
                <p className="text-gray-600">{request.notes || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Created By</span>
                <p>{request.createdBy?.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Created At</span>
                <p>{new Date(request.createdAt).toLocaleString()}</p>
              </div>
              {request.approvedBy && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Approved By</span>
                    <p>{request.approvedBy?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Approved At</span>
                    <p>{new Date(request.approvedAt).toLocaleString()}</p>
                  </div>
                </>
              )}
              {request.cancelledBy && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Cancelled By</span>
                    <p>{request.cancelledBy?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Cancelled At</span>
                    <p>{new Date(request.cancelledAt).toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">Cancellation Reason</span>
                    <p className="text-red-600">{request.cancellationReason || "—"}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Takas List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">
              Takas ({request.takas?.length || 0})
            </h3>
            {request.takas?.length === 0 ? (
              <p className="text-gray-400 text-sm">No takas in this request</p>
            ) : (
              <div className="space-y-3">
                {request.takas.map((taka) => (
                  <Link
                    key={taka._id}
                    href={`/admin/textiles/takas/${taka._id}/view`}
                    className="block p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition border border-gray-100"
                  >
                    <div className="font-mono font-bold text-blue-600 text-sm">
                      {taka.takaNumber}
                    </div>
                    <div className="text-xs text-gray-600">
                      {taka.fabric?.itemName} – {taka.quantity} Mtr
                    </div>
                    {taka.shade && (
                      <div className="text-xs text-gray-400">{taka.shade.name}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
