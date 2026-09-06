// app/admin/textiles/lot-assignment/[id]/edit/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";

export default function EditLotAssignment() {
  const { id } = useParams();
  const router = useRouter();

  const [formData, setFormData] = useState({
    productionOrder: "",
    lot: "",
    item: "",
    assignedQuantity: 0,
    status: "pending",
  });
  const [productionOrders, setProductionOrders] = useState([]);
  const [availableLots, setAvailableLots] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [originalLotId, setOriginalLotId] = useState(null);

  // --- react-select options ---
  const poOptions = productionOrders.map((po) => ({
    value: po._id,
    label: po.productionDocNo || po.orderNumber || po._id,
  }));

  const lotOptions = availableLots.map((lot) => ({
    value: lot._id,
    label: `${lot.lotNumber} – ${lot.product?.itemName || "N/A"} (${lot.quantity} ${lot.unit})`,
  }));

  // Load master data and existing assignment
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Fetch production orders, items, and the assignment
        const [poRes, itemRes, assignRes] = await Promise.all([
          api.get("/production-orders?limit=500", headers),
          api.get("/items?limit=500", headers),
          api.get(`/textiles/lot-assignments/${id}`, headers),
        ]);

        // Handle wrapped or unwrapped responses
        const orders = poRes.data?.data || poRes.data || [];
        const itemsData = itemRes.data?.data || itemRes.data || [];
        const assignment = assignRes.data?.data || assignRes.data;

        setProductionOrders(orders);
        setItems(itemsData);

        // Store original lot ID for later filtering
        setOriginalLotId(assignment.lot?._id || assignment.lot);

        // Populate form – extract IDs if populated objects
        setFormData({
          productionOrder: assignment.productionOrder?._id || assignment.productionOrder || "",
          lot: assignment.lot?._id || assignment.lot || "",
          item: assignment.item?._id || assignment.item || "",
          assignedQuantity: assignment.assignedQuantity || 0,
          status: assignment.status || "pending",
        });

        // If productionOrder is set, fetch available lots (excluding the current one)
        const poId = assignment.productionOrder?._id || assignment.productionOrder;
        if (poId) {
          const lotsRes = await api.get(
            `/textiles/lot-assignments/available-lots?productionOrder=${poId}`,
            headers
          );
          const available = lotsRes.data?.data || lotsRes.data || [];
          // Exclude the currently assigned lot from the dropdown
          const currentLotId = assignment.lot?._id || assignment.lot;
          const filtered = available.filter(l => l._id !== currentLotId);
          setAvailableLots(filtered);
        }

        setFetching(false);
      } catch (err) {
        console.error("Load edit data error:", err);
        toast.error("Failed to load data");
        setFetching(false);
      }
    };
    loadData();
  }, [id]);

  // When productionOrder changes, fetch available lots (excluding the current lot)
  useEffect(() => {
    const fetchLots = async () => {
      if (!formData.productionOrder) {
        setAvailableLots([]);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(
          `/textiles/lot-assignments/available-lots?productionOrder=${formData.productionOrder}`,
          headers
        );
        const available = res.data?.data || res.data || [];
        // Exclude the currently assigned lot if it's still in the list
        const filtered = available.filter(l => l._id !== originalLotId);
        setAvailableLots(filtered);
      } catch {
        toast.error("Failed to load available lots");
      }
    };
    fetchLots();
  }, [formData.productionOrder, originalLotId]);

  // When lot changes, auto‑set item
  useEffect(() => {
    const lot = availableLots.find((l) => l._id === formData.lot);
    if (lot) {
      setFormData((prev) => ({ ...prev, item: lot.product?._id || "" }));
    } else if (formData.lot === originalLotId) {
      // If the current lot is selected (original), we need to fetch its item from original data
      // But we already have it from the assignment load – we can just keep it.
    }
  }, [formData.lot, availableLots, originalLotId]);

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

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(`/textiles/lot-assignments/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Assignment updated!");
      router.push("/admin/textiles/lot-assignment");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Loading skeleton ---
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

  // Find the current lot option to display in dropdown (if original lot is not in available list)
  const currentLotOption = formData.lot === originalLotId && originalLotId
    ? { value: originalLotId, label: "Current Lot (not in available list)" }
    : null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Edit Lot Assignment</h1>
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
            value={
              lotOptions.find((opt) => opt.value === formData.lot) ||
              currentLotOption ||
              null
            }
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
          {formData.lot === originalLotId && originalLotId && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ This is the currently assigned lot. It may not appear in the list.
            </p>
          )}
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

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status || "pending"}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="used">Used</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Saving..." : "Update"}
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