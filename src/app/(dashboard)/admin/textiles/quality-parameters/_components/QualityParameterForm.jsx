// app/admin/textiles/quality-parameters/_components/QualityParameterForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";

export default function QualityParameterForm({ id }) {
  const router = useRouter();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    method: "",
    minValue: 0,
    maxValue: 100,
    unit: "",
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await api.get(`/textiles/quality-parameters/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFormData(res.data.data);
        } catch {
          toast.error("Failed to load");
        } finally {
          setFetching(false);
        }
      };
      fetchData();
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const method = isEdit ? "put" : "post";
      const url = isEdit ? `/textiles/quality-parameters/${id}` : "/textiles/quality-parameters";
      await api[method](url, formData, headers);
      toast.success(isEdit ? "Updated!" : "Created!");
      router.push("/admin/textiles/quality-parameters");
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        {isEdit ? "Edit Quality Parameter" : "Create Quality Parameter"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Code *</label>
          <input name="code" value={formData.code} onChange={handleChange} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input name="name" value={formData.name} onChange={handleChange} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Method</label>
          <input name="method" value={formData.method || ""} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Min Value</label>
            <input type="number" name="minValue" value={formData.minValue || 0} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Value</label>
            <input type="number" name="maxValue" value={formData.maxValue || 100} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unit</label>
          <input name="unit" value={formData.unit || ""} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select name="status" value={formData.status || "active"} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50">
            <FaSave size={14} /> {loading ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={() => router.back()} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">
            <FaTimes size={14} /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
}