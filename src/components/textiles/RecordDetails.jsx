"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { ArrowLeft, RefreshCw } from "lucide-react";

const hidden = new Set(["_id", "__v", "company", "companyId", "createdBy", "updatedAt"]);

function labelFor(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
    return value.name || value.itemName || value.takaNumber || value.orderNumber || value.code || value._id || "—";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  return String(value);
}

export default function RecordDetails({ title, endpoint, backHref }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      setRecord(response.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, title]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={backHref} className="rounded-xl border bg-white p-2 text-slate-600 hover:bg-slate-100" aria-label="Back"><ArrowLeft size={20} /></Link>
            <div><h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="text-sm text-slate-500">Record details</p></div>
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : loading ? <div className="h-64 animate-pulse rounded-2xl bg-white" /> : !record ? <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Record not found.</div> : (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(record).filter(([key]) => !hidden.has(key)).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{labelFor(key)}</dt><dd className="mt-1 break-words font-medium text-slate-800">{displayValue(value)}</dd></div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
