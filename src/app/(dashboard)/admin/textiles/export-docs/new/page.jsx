"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";

export default function NewExportDoc() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    customer: "",
    customerReference: "",
    shippedDate: new Date().toISOString().split("T")[0],
    shippingMethod: "sea",
    shippingCompany: "",
    billOfLading: "",
    vesselName: "",
    voyageNumber: "",
    portOfLoading: "",
    portOfDischarge: "",
    containerNumber: "",
    sealNumber: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    invoiceValue: 0,
    currency: "USD",
    incoterms: "FOB",
    paymentTerms: "",
    takas: [],
    shippingMarks: [{ markNumber: "1", description: "", cartons: 1, weight: 0, volume: 0 }],
    status: "draft",
    remarks: "",
  });
  const [customers, setCustomers] = useState([]);
  const [takas, setTakas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [custRes, takaRes] = await Promise.all([
          api.get("/customers?limit=100", headers),
          api.get("/textiles/takas?status=available", headers),
        ]);
        setCustomers(custRes.data.data || []);
        setTakas(takaRes.data.data || []);
        setFetching(false);
      } catch {
        toast.error("Failed to load master data");
        setFetching(false);
      }
    };
    loadMasters();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTakaSelect = (e) => {
    const selectedIds = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, takas: selectedIds }));
  };

  const handleMarkChange = (index, field, value) => {
    const newMarks = [...formData.shippingMarks];
    newMarks[index][field] = value;
    setFormData((prev) => ({ ...prev, shippingMarks: newMarks }));
  };

  const addMark = () => {
    setFormData((prev) => ({
      ...prev,
      shippingMarks: [
        ...prev.shippingMarks,
        { markNumber: `${prev.shippingMarks.length + 1}`, description: "", cartons: 1, weight: 0, volume: 0 },
      ],
    }));
  };

  const removeMark = (index) => {
    const newMarks = formData.shippingMarks.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, shippingMarks: newMarks }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer) return toast.warn("Please select a customer");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.post("/textiles/export-docs", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Export document created!");
      router.push("/admin/textiles/export-docs");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Create Export Document</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer *</label>
            <select
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Reference</label>
            <input
              name="customerReference"
              value={formData.customerReference}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
            <input
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
            <input
              type="date"
              name="invoiceDate"
              value={formData.invoiceDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice Value</label>
            <input
              type="number"
              name="invoiceValue"
              value={formData.invoiceValue}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Incoterms</label>
            <select
              name="incoterms"
              value={formData.incoterms}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="FOB">FOB</option>
              <option value="CIF">CIF</option>
              <option value="EXW">EXW</option>
              <option value="DDP">DDP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
            <input
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* Shipping Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Shipping Method</label>
            <select
              name="shippingMethod"
              value={formData.shippingMethod}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="sea">Sea</option>
              <option value="air">Air</option>
              <option value="road">Road</option>
              <option value="express">Express</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Shipped Date</label>
            <input
              type="date"
              name="shippedDate"
              value={formData.shippedDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Shipping Company</label>
            <input
              name="shippingCompany"
              value={formData.shippingCompany}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bill of Lading</label>
            <input
              name="billOfLading"
              value={formData.billOfLading}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Vessel Name</label>
            <input
              name="vesselName"
              value={formData.vesselName}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Voyage Number</label>
            <input
              name="voyageNumber"
              value={formData.voyageNumber}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Port of Loading</label>
            <input
              name="portOfLoading"
              value={formData.portOfLoading}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Port of Discharge</label>
            <input
              name="portOfDischarge"
              value={formData.portOfDischarge}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Container Number</label>
            <input
              name="containerNumber"
              value={formData.containerNumber}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Seal Number</label>
            <input
              name="sealNumber"
              value={formData.sealNumber}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* Takas */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Takas</label>
          <select
            multiple
            name="takas"
            value={formData.takas}
            onChange={handleTakaSelect}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none min-h-[100px]"
          >
            {takas.map((t) => (
              <option key={t._id} value={t._id}>
                {t.takaNumber} – {t.fabric?.itemName} ({t.quantity} Mtr)
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple Takas</p>
        </div>

        {/* Shipping Marks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Shipping Marks</label>
            <button
              type="button"
              onClick={addMark}
              className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-200"
            >
              <FaPlus size={10} /> Add Mark
            </button>
          </div>
          <div className="space-y-2">
            {formData.shippingMarks.map((mark, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  placeholder="Mark #"
                  value={mark.markNumber}
                  onChange={(e) => handleMarkChange(idx, "markNumber", e.target.value)}
                  className="w-20 p-1 border border-gray-300 rounded text-sm"
                />
                <input
                  placeholder="Description"
                  value={mark.description}
                  onChange={(e) => handleMarkChange(idx, "description", e.target.value)}
                  className="flex-1 p-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Cartons"
                  value={mark.cartons}
                  onChange={(e) => handleMarkChange(idx, "cartons", parseInt(e.target.value))}
                  className="w-20 p-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Weight (kg)"
                  value={mark.weight}
                  onChange={(e) => handleMarkChange(idx, "weight", parseFloat(e.target.value))}
                  className="w-24 p-1 border border-gray-300 rounded text-sm"
                />
                {formData.shippingMarks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMark(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Creating..." : "Create Document"}
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