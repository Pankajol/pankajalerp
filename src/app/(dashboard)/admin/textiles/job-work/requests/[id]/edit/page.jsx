// app/admin/textiles/job-work/requests/[id]/edit/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";

export default function EditJobWorkRequest() {
  const { id } = useParams();
  const router = useRouter();

  const [formData, setFormData] = useState({
    vendor: "",
    customer: "",
    process: "",
    takas: [],
    design: "",
    customerCode: "",
    customerName: "",
    deliveryDesign: "",
    deliveryDate: "",
    notes: "",
    status: "draft",
  });
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableTakas, setAvailableTakas] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [originalTakas, setOriginalTakas] = useState([]);

  // ─── Load master data and request ───
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Load vendors, takas, and the request
        const [vendorRes, customerRes, takaRes, designRes, requestRes] = await Promise.all([
          api.get("/suppliers?limit=100", headers),
          api.get("/customers?limit=100", headers),
          api.get("/textiles/takas?status=available", headers),
          api.get("/textiles/designs", headers),
          api.get(`/textiles/job-work-requests/${id}`, headers),
        ]);

        const vendorsData = vendorRes.data?.data || vendorRes.data || [];
        const takasData = takaRes.data?.data || takaRes.data || [];
        const request = requestRes.data?.data || requestRes.data;

        setVendors(vendorsData);
        setCustomers(customerRes.data?.data || []);
        setAvailableTakas(takasData);
        setDesigns(designRes.data?.data || []);

        // Store original Taka IDs for later reference
        const originalTakaIds = request.takas?.map(t => t._id || t) || [];
        setOriginalTakas(originalTakaIds);

        // Populate form
        setFormData({
          vendor: request.vendor?._id || request.vendor || "",
          customer: request.customer?._id || request.customer || "",
          process: request.process || "",
          takas: originalTakaIds,
          design: request.design?._id || request.design || "",
          customerCode: request.customerCode || "",
          customerName: request.customerName || "",
          deliveryDesign: request.deliveryDesign || "",
          deliveryDate: request.deliveryDate ? new Date(request.deliveryDate).toISOString().split("T")[0] : "",
          notes: request.notes || "",
          status: request.status || "draft",
        });

        setFetching(false);
      } catch (err) {
        console.error("Load edit data error:", err);
        toast.error("Failed to load request data");
        setFetching(false);
      }
    };
    loadData();
  }, [id]);

  // ─── Handlers ───
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTakaSelect = (selectedOptions) => {
    const selectedIds = selectedOptions ? selectedOptions.map((o) => o.value) : [];
    setFormData((prev) => ({ ...prev, takas: selectedIds }));
  };

  // ─── Submit Update ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.takas.length === 0) {
      return toast.warn("Please select at least one Taka");
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(`/textiles/job-work-requests/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Job work request updated!");
      router.push(`/admin/textiles/job-work/requests/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // ─── Options for react-select ───
  const takaOptions = availableTakas.map((t) => ({
    value: t._id,
    label: `${t.takaNumber} – ${t.fabric?.itemName || "N/A"} (${t.quantity} Mtr)`,
  }));

  const customerOptions = customers.map((customer) => ({
    value: customer._id,
    label: customer.customerName || "Unnamed customer",
    code: customer.customerCode || "",
  }));
  const designOptions = designs.map((design) => ({
    value: design._id,
    label: `${design.designCode} - ${design.description}`,
  }));

  // Include currently selected Takas even if they are not in "available" list
  const selectedTakaOptions = formData.takas.map((tId) => {
    const found = takaOptions.find((opt) => opt.value === tId);
    if (found) return found;
    // If not found, create a temporary option (maybe from original data)
    const original = originalTakas.find((id) => id === tId);
    return original ? { value: original, label: `Taka (ID: ${original})` } : null;
  }).filter(Boolean);

  // ─── Loading skeleton ───
  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        Edit Job Work Request
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vendor & Process */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Vendor *</label>
            <select
              name="vendor"
              value={formData.vendor}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">Select Vendor</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.supplierName || v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Process *</label>
            <select
              name="process"
              value={formData.process}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">Select Process</option>
              <option value="Dyeing">Dyeing</option>
              <option value="Printing">Printing</option>
              <option value="Finishing">Finishing</option>
              <option value="Washing">Washing</option>
              <option value="Sanforizing">Sanforizing</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Takas - Multi-select */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Takas *</label>
          <Select
            options={takaOptions}
            isMulti
            value={selectedTakaOptions}
            onChange={handleTakaSelect}
            placeholder="Select Takas for job work..."
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "0.75rem",
                borderColor: "#e5e7eb",
                "&:hover": { borderColor: "#93c5fd" },
              }),
            }}
          />
          <p className="text-xs text-gray-400 mt-1">
            {formData.takas.length} Takas selected
          </p>
        </div>

        {/* Design & Customer */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Design *</label>
            <Select
              options={designOptions}
              value={designOptions.find((option) => option.value === formData.design) || null}
              onChange={(option) => setFormData((current) => ({ ...current, design: option?.value || "" }))}
              placeholder="Search design code or description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <Select
              options={customerOptions}
              isClearable
              isSearchable
              value={customerOptions.find((option) => option.value === formData.customer) || (formData.customerName ? { value: formData.customer, label: formData.customerName } : null)}
              onChange={(option) => setFormData((current) => ({ ...current, customer: option?.value || "", customerName: option?.label || "", customerCode: option?.code || "" }))}
              placeholder="Search customer..."
            />
          </div>
        </div>

        {/* Delivery Design */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Delivery Design</label>
          <input
            name="deliveryDesign"
            value={formData.deliveryDesign}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* Delivery Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Expected Delivery Date</label>
          <input
            type="date"
            name="deliveryDate"
            value={formData.deliveryDate}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Saving..." : "Update Request"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            <FaTimes size={14} /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
