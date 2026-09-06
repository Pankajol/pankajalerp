"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";

export default function NewJobWorkChallan() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    request: "",
    fromWarehouse: "",
    toWarehouse: "",
    vendorChallanNo: "",
    issuedDate: new Date().toISOString().split("T")[0],
    expectedReturnDate: "",
    transport: "",
    vehicleNo: "",
    driverName: "",
    notes: "",
    items: [],
  });
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Load approved requests and warehouses
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [reqRes, whRes] = await Promise.all([
          api.get("/textiles/job-work-requests?status=approved&withoutChallan=true", headers),
          api.get("/warehouse", headers),
        ]);
        const requestData = reqRes.data.data || [];
        setRequests(requestData);
        setWarehouses(whRes.data.data || []);
        const requestedId = new URLSearchParams(window.location.search).get("requestId");
        const requested = requestData.find((item) => item._id === requestedId);
        if (requested) {
          setSelectedRequest(requested);
          setFormData((current) => ({
            ...current,
            request: requested._id,
            items: (requested.takas || []).map((taka) => ({
              taka: taka._id, takaNumber: taka.takaNumber, quantity: taka.quantity,
              item: taka.fabric?._id || taka.fabric || "", batch: taka.lot?.lotNumber || taka.lot?._id || taka.lot || "", uom: "Mtr", rate: 0, amount: 0,
              actualMeters: taka.quantity, jobWorkMeters: 0, weight: taka.weight || 0, notes: "",
            })),
          }));
        }
        setFetching(false);
      } catch {
        toast.error("Failed to load master data");
        setFetching(false);
      }
    };
    loadMasters();
  }, []);

  // When request changes, auto-populate items
  const handleRequestChange = (selectedOption) => {
    const reqId = selectedOption ? selectedOption.value : "";
    setFormData((prev) => ({ ...prev, request: reqId }));
    const req = requests.find((r) => r._id === reqId);
    setSelectedRequest(req);
    if (req) {
      // Auto-create items from request takas
      const items = (req.takas || []).map((taka) => ({
        taka: taka._id,
        takaNumber: taka.takaNumber,
        quantity: taka.quantity,
        item: taka.fabric?._id || taka.fabric || "",
        batch: taka.lot?.lotNumber || taka.lot?._id || taka.lot || "",
        uom: "Mtr", rate: 0, amount: 0,
        actualMeters: taka.quantity,
        jobWorkMeters: 0,
        weight: 0,
        notes: "",
      }));
      setFormData((prev) => ({ ...prev, items }));
    } else {
      setFormData((prev) => ({ ...prev, items: [] }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => ({ ...prev, items: prev.items.map((item, rowIndex) => { if (rowIndex !== index) return item; const next = { ...item, [field]: value }; next.amount = Number(next.quantity || 0) * Number(next.rate || 0); return next; }) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      return toast.warn("Please add at least one item");
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.post("/textiles/job-work-challans", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Challan created!");
      router.push(`/admin/textiles/job-work/challans/${response.data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  const requestOptions = requests.map((r) => ({
    value: r._id,
    label: `${r.requestNumber} - ${r.vendor?.supplierName || "Vendor"} (${r.process})`,
  }));

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        Create Job Work Challan
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Request */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Request *</label>
          <Select
            options={requestOptions}
            value={requestOptions.find((option) => option.value === formData.request) || null}
            onChange={handleRequestChange}
            placeholder="Select approved request..."
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
          {selectedRequest && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
              <p><strong>Vendor:</strong> {selectedRequest.vendor?.supplierName || "—"}</p>
              <p><strong>Process:</strong> {selectedRequest.process}</p>
              <p><strong>Takas:</strong> {selectedRequest.takas?.length || 0}</p>
            </div>
          )}
        </div>

        {/* Warehouses */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">From Warehouse</label>
            <select
              name="fromWarehouse"
              value={formData.fromWarehouse}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.warehouseName || w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Warehouse (Vendor)</label>
            <select
              name="toWarehouse"
              value={formData.toWarehouse}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.warehouseName || w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendor Challan & Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Vendor Challan No.</label>
            <input
              name="vendorChallanNo"
              value={formData.vendorChallanNo}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Expected Return Date</label>
            <input
              type="date"
              name="expectedReturnDate"
              value={formData.expectedReturnDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* Transport Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Transport</label>
            <input
              name="transport"
              value={formData.transport}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle No.</label>
            <input
              name="vehicleNo"
              value={formData.vehicleNo}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Driver Name</label>
          <input
            name="driverName"
            value={formData.driverName}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        {/* Items List */}
        {formData.items.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Takas to Issue</label>
            <div className="space-y-2">
              {formData.items.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-mono text-sm text-indigo-600 w-24">
                    {item.takaNumber || "Taka"}
                  </span>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value))}
                    className="w-20 p-1 border border-gray-300 rounded"
                    step="0.01"
                    min="0.01"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Actual Mtr"
                    value={item.actualMeters}
                    onChange={(e) => handleItemChange(idx, "actualMeters", parseFloat(e.target.value))}
                    className="w-24 p-1 border border-gray-300 rounded"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-xs text-gray-500">Mtr</span>
                  <input placeholder="Batch" value={item.batch || ""} onChange={(e) => handleItemChange(idx, "batch", e.target.value)} className="w-24 p-1 border border-gray-300 rounded" />
                  <input placeholder="UOM" value={item.uom || "Mtr"} onChange={(e) => handleItemChange(idx, "uom", e.target.value)} className="w-16 p-1 border border-gray-300 rounded" />
                  <input type="number" min="0" step="0.01" placeholder="Rate" value={item.rate || 0} onChange={(e) => handleItemChange(idx, "rate", Number(e.target.value))} className="w-20 p-1 border border-gray-300 rounded" />
                  <span className="text-xs font-bold text-indigo-700">₹{(Number(item.quantity || 0) * Number(item.rate || 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Creating..." : "Create Challan"}
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
