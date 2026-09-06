// app/admin/textiles/lot-assignment/new/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";

export default function NewLotAssignment() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    productionOrder: "",
    lot: "",
    item: "",
    assignedQuantity: 0,
  });
  const [productionOrders, setProductionOrders] = useState([]);
  const [availableLots, setAvailableLots] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // --- react-select options ---
  // ✅ Use productionDocNo as the label (fallback to orderNumber)
  const poOptions = productionOrders.map((po) => ({
    value: po._id,
    label: po.productionDocNo || po.orderNumber || po._id,
  }));

  const lotOptions = availableLots.map((lot) => ({
    value: lot._id,
    label: `${lot.lotNumber} – ${lot.product?.itemName || "N/A"} (${lot.quantity} ${lot.unit})`,
  }));

  // Load master data
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [poRes, itemRes] = await Promise.all([
          api.get("/production-orders?limit=500", headers),
          api.get("/items?limit=500", headers),
        ]);
        setProductionOrders(poRes.data.data || []);
        setItems(itemRes.data.data || []);
        setFetching(false);
      } catch {
        toast.error("Failed to load master data");
        setFetching(false);
      }
    };
    loadMasters();
  }, []);

  // When PO changes, fetch available lots
  useEffect(() => {
    const fetchLots = async () => {
      if (!formData.productionOrder) {
        setAvailableLots([]);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(
          `/textiles/lot-assignments/available-lots?productionOrder=${formData.productionOrder}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAvailableLots(res.data.data || []);
      } catch {
        toast.error("Failed to load available lots");
      }
    };
    fetchLots();
  }, [formData.productionOrder]);

  // When lot changes, auto-set item
  useEffect(() => {
    const lot = availableLots.find((l) => l._id === formData.lot);
    if (lot) {
      setFormData((prev) => ({ ...prev, item: lot.product?._id || "" }));
    }
  }, [formData.lot, availableLots]);

  // --- Handlers ---
  const handlePOChange = (selected) => {
    setFormData((prev) => ({
      ...prev,
      productionOrder: selected ? selected.value : "",
      lot: "",          // reset lot when PO changes
      item: "",
    }));
  };

  const handleLotChange = (selected) => {
    setFormData((prev) => ({ ...prev, lot: selected ? selected.value : "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.post("/textiles/lot-assignments", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Lot assigned!");
      router.push("/admin/textiles/lot-assignment");
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Assign Lot to Production Order</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Production Order - Searchable */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Production Order *</label>
          <Select
            options={poOptions}
            value={poOptions.find((opt) => opt.value === formData.productionOrder) || null}
            onChange={handlePOChange}
            placeholder="Search production order..."
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "0.75rem",
                borderColor: "#e5e7eb",
                "&:hover": { borderColor: "#93c5fd" },
                boxShadow: "none",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#eff6ff" : "white",
                color: state.isFocused ? "#1e40af" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Lot - Searchable */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Lot *</label>
          <Select
            options={lotOptions}
            value={lotOptions.find((opt) => opt.value === formData.lot) || null}
            onChange={handleLotChange}
            placeholder={formData.productionOrder ? "Search lot..." : "Select a production order first"}
            isDisabled={!formData.productionOrder}
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "0.75rem",
                borderColor: "#e5e7eb",
                "&:hover": { borderColor: "#93c5fd" },
                boxShadow: "none",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#eff6ff" : "white",
                color: state.isFocused ? "#1e40af" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Item - Auto-filled, read-only */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Item</label>
          <input
            type="text"
            value={formData.item ? items.find((i) => i._id === formData.item)?.itemName : ""}
            readOnly
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
          />
        </div>

        {/* Assigned Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Assigned Quantity *</label>
          <input
            type="number"
            name="assignedQuantity"
            value={formData.assignedQuantity}
            onChange={handleChange}
            required
            min="0.01"
            step="0.01"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Saving..." : "Assign"}
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