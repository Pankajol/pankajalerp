"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import api from "@/lib/api";

export default function DesignsPage() {
  const [designs, setDesigns] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(
        `/textiles/designs?search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDesigns(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Design Master
          </h1>
          <p className="text-sm text-gray-500">
            Central design definitions and quality parameters.
          </p>
        </div>
        <Link
          href="/admin/textiles/designs/new"
          className="rounded-xl bg-violet-600 px-5 py-2.5 font-bold text-white"
        >
          + New Design
        </Link>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search code, description or category..."
        className="mb-4 w-full max-w-md rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-violet-400"
      />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Fabric</th>
              <th className="px-5 py-3">QC parameters</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : designs.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400">
                  No designs found
                </td>
              </tr>
            ) : (
              designs.map((design) => (
                <tr key={design._id}>
                  <td className="px-5 py-4 font-bold text-violet-700">
                    {design.designCode}
                  </td>
                  <td className="px-5 py-4">{design.description}</td>
                  <td className="px-5 py-4">
                    {design.fabric?.itemName || "—"}
                  </td>
                  <td className="px-5 py-4">
                    {design.qualityParameters?.length || 0}
                  </td>
                  <td className="px-5 py-4 capitalize">{design.status}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/textiles/designs/${design._id}/edit`}
                      className="font-semibold text-blue-600"
                    >
                      Edit
                    </Link>{" "}
                    <Link
                      href={`/admin/textiles/traceability/design/${design._id}`}
                      className="ml-3 font-semibold text-violet-600"
                    >
                      History
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
