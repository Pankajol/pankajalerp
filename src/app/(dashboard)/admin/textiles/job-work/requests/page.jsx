"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSync,
  FaEye,
  FaCheck,
  FaTimes,
  FaPaperPlane,
  FaFileInvoice,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function JobWorkRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (statusFilter) params.append("status", statusFilter);
        const res = await api.get(
          `/textiles/job-work-requests?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setRequests(res.data.data || []);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load requests");
        toast.error("Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (id) => {
    if (!confirm("Submit this request for approval?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.post(`/textiles/job-work-requests/${id}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Request submitted for approval");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed");
    }
  };

  const handleApprove = async (id) => {
    if (!confirm("Approve this request?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/textiles/job-work-requests/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Request approved");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Approval failed");
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt("Enter cancellation reason:");
    if (reason === null) return;
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/textiles/job-work-requests/${id}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Request cancelled");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cancel failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this request?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/job-work-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const getStatusColor = (status) => {
    const map = {
      draft: "bg-gray-100 text-gray-600",
      submitted: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
      "in-progress": "bg-indigo-100 text-indigo-700",
      cancelled: "bg-red-100 text-red-700",
      completed: "bg-emerald-100 text-emerald-700",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">📋</span> Job Work Requests
          </h1>
          <p className="text-sm text-gray-500">Send fabric to vendors for processing</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <Link
            href="/admin/textiles/job-work/requests/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md"
          >
            <FaPlus size={12} /> New Request
          </Link>
        </div>
      </div>

      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Total", requests.length, "text-slate-800"],
            ["Awaiting approval", requests.filter((item) => item.status === "submitted").length, "text-blue-600"],
            ["Approved", requests.filter((item) => item.status === "approved").length, "text-emerald-600"],
            ["In progress", requests.filter((item) => item.status === "in-progress").length, "text-indigo-600"],
          ].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p></div>)}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData(true);
          }}
          className="flex gap-2 flex-wrap"
        >
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by request # or vendor..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none w-60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="in-progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{requests.length} requests</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchData()}
            className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Request #
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Vendor
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Process
                </th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">
                  Takas
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <p className="font-semibold text-slate-600">No requests found</p>
                    <p className="mt-1 text-xs">Try another search or create the first request.</p>
                    <Link href="/admin/textiles/job-work/requests/new" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">New Request</Link>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r._id} className="hover:bg-blue-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                      {r.requestNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{r.vendor?.supplierName || "—"}</td>
                    <td className="px-6 py-4 text-gray-600">{r.process}</td>
                    <td className="px-6 py-4 text-center font-bold">
                      {r.takas?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/textiles/job-work/requests/${r._id}`}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <FaEye size={14} />
                      </Link>
                      {r.status === "draft" && (
                        <>
                          <Link
                            href={`/admin/textiles/job-work/requests/${r._id}/edit`}
                            className="p-2 text-gray-400 hover:text-blue-600"
                          >
                            <FaEdit size={14} />
                          </Link>
                          <button
                            onClick={() => handleDelete(r._id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <FaTrash size={14} />
                          </button>
                          <button onClick={() => handleSubmit(r._id)} className="p-2 text-blue-500 hover:text-blue-700" title="Submit for approval"><FaPaperPlane size={14} /></button>
                        </>
                      )}
                      {r.status === "submitted" && (
                        <>
                          <button
                            onClick={() => handleApprove(r._id)}
                            className="p-2 text-green-500 hover:text-green-700"
                            title="Approve"
                          >
                            <FaCheck size={14} />
                          </button>
                          <button
                            onClick={() => handleCancel(r._id)}
                            className="p-2 text-red-500 hover:text-red-700"
                            title="Cancel"
                          >
                            <FaTimes size={14} />
                          </button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <>
                          {r.linkedChallan ? (
                            <Link href={`/admin/textiles/job-work/challans/${r.linkedChallan._id}`} className="p-2 text-indigo-500 hover:text-indigo-700" title={`View ${r.linkedChallan.challanNumber}`}><FaEye size={14} /></Link>
                          ) : (
                            <Link href={`/admin/textiles/job-work/challans/new?requestId=${r._id}`} className="p-2 text-indigo-500 hover:text-indigo-700" title="Create challan"><FaFileInvoice size={14} /></Link>
                          )}
                          {!r.linkedChallan && <button onClick={() => handleCancel(r._id)} className="p-2 text-red-500 hover:text-red-700" title="Cancel"><FaTimes size={14} /></button>}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
