"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { FaArrowLeft, FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

export default function ViewQCInspection() {
  const { id } = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/textiles/qc-inspections/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInspection(res.data.data);
      } catch {
        toast.error("Failed to load inspection");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this inspection?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/qc-inspections/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      router.push("/admin/textiles/quality-inspection");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!inspection) return <div className="p-6 text-center text-red-500">Not found</div>;

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/textiles/quality-inspection"
          className="p-2 bg-white rounded-xl shadow hover:bg-gray-50"
        >
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">
          QC Inspection: {inspection.inspectionNumber}
        </h1>
        <button
          onClick={handleDelete}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
        >
          <FaTrash size={14} /> Delete
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">Inspection Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Inspection #</span>
                <p className="font-mono font-bold text-purple-600">{inspection.inspectionNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Taka</span>
                <p className="font-medium">{inspection.taka?.takaNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Inspector</span>
                <p>{inspection.inspector?.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Date</span>
                <p>{new Date(inspection.inspectedDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Grade</span>
                <p>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    inspection.grade === "A" ? "bg-emerald-100 text-emerald-700" :
                    inspection.grade === "Reject" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {inspection.grade}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Result</span>
                <p>
                  {inspection.finalResult === "pass" ? (
                    <span className="text-green-600 font-bold flex items-center gap-1"><FaCheck /> PASS</span>
                  ) : (
                    <span className="text-red-600 font-bold flex items-center gap-1"><FaTimes /> FAIL</span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-gray-500">Remarks</span>
                <p className="text-gray-600">{inspection.remarks || "—"}</p>
              </div>
            </div>
          </div>

          {/* Parameters */}
          {inspection.parameters?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">Quality Parameters</h3>
              <div className="space-y-2">
                {inspection.parameters.map((param, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-medium w-32 text-sm">{param.parameter?.name}</span>
                    <span className="text-sm text-gray-600">Actual: {param.actualValue} {param.parameter?.unit}</span>
                    <span className="text-sm text-gray-400">
                      Range: {param.parameter?.minValue}–{param.parameter?.maxValue}
                    </span>
                    {param.result === "pass" ? (
                      <FaCheck className="text-green-600 ml-auto" />
                    ) : (
                      <FaTimes className="text-red-600 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Defects */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">
              Defects ({inspection.defects?.length || 0})
            </h3>
            {inspection.defects?.length === 0 ? (
              <p className="text-gray-400 text-sm">No defects found ✅</p>
            ) : (
              <div className="space-y-3">
                {inspection.defects.map((defect, idx) => (
                  <div key={idx} className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="font-bold text-red-600 text-sm">{defect.type}</div>
                    <div className="text-xs text-gray-600">Position: {defect.position || "—"}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        defect.severity === "critical" ? "bg-red-200 text-red-700" :
                        defect.severity === "major" ? "bg-amber-200 text-amber-700" :
                        "bg-gray-200 text-gray-700"
                      }`}>
                        {defect.severity}
                      </span>
                      <span className="text-xs text-gray-600">{defect.quantity} Mtr</span>
                    </div>
                    {defect.remarks && <div className="text-xs text-gray-400 mt-1">{defect.remarks}</div>}
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