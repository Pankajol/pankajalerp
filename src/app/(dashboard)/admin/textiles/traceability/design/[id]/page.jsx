"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import api from "@/lib/api";

const labels = {
  bom: "BOM",
  "production-order": "Production Order",
  "job-work-request": "Job Work Request",
  taka: "Taka / Roll",
  "qc-inspection": "QC Inspection",
  costing: "Costing",
};

export default function DesignTraceabilityPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get(`/textiles/designs/${id}/traceability`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(response.data.data);
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to load design history"
        );
      }
    };
    load();
  }, [id]);

  if (!data)
    return (
      <div className="p-10 text-center text-gray-500">
        Loading design history...
      </div>
    );
  const cards = [
    ["BOMs", data.summary.boms],
    ["Production Orders", data.summary.productionOrders],
    ["Job Work Requests", data.summary.jobWorkRequests],
    ["Takas", data.summary.takas],
    ["QC Inspections", data.summary.inspections],
    ["Total Margin", `₹${Number(data.summary.totalMargin || 0).toFixed(2)}`],
  ];
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-violet-600">{data.design.designCode}</p>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Design Traceability
          </h1>
          <p className="text-gray-500">{data.design.description}</p>
        </div>
        <Link
          href="/admin/textiles/designs"
          className="rounded-xl bg-gray-100 px-4 py-2 font-semibold"
        >
          Back
        </Link>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">History</h2>
        {data.timeline.length === 0 ? (
          <p className="py-8 text-center text-gray-400">
            No linked activity yet
          </p>
        ) : (
          <ol className="space-y-4 border-l-2 border-violet-100 pl-5">
            {data.timeline.map((event, index) => (
              <li
                key={`${event.type}-${event.data._id}-${index}`}
                className="relative"
              >
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-violet-500" />
                <p className="font-bold">{labels[event.type] || event.type}</p>
                <p className="text-sm text-gray-600">
                  {event.data.orderNumber ||
                    event.data.requestNumber ||
                    event.data.takaNumber ||
                    event.data.inspectionNumber ||
                    event.data.costingNumber}
                </p>
                <time className="text-xs text-gray-400">
                  {event.date ? new Date(event.date).toLocaleString() : "—"}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
