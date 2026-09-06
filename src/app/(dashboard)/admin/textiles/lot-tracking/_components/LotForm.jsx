// app/admin/textiles/lot-tracking/_components/LotForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";

export default function LotForm({ id }) {
  const router = useRouter();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    lotNumber: "",
    product: "",
    shade: "",
    quantity: 0,
    unit: "",
    supplier: "",
    purchaseOrder: "",
    receivedDate: "",
    qualityGrade: "",
    notes: "",
    status: "in-stock",
  });
  const [products, setProducts] = useState([]);
  const [shades, setShades] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // --- react-select options ---
  const productOptions = products.map((p) => ({
    value: p._id,
    label: `${p.itemName} (${p.itemCode || p._id.slice(-4)})`,
  }));
  const shadeOptions = shades.map((s) => ({
    value: s._id,
    label: `${s.name} (${s.code || s._id.slice(-4)})`,
  }));
  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.supplierName,
  }));
  const purchaseOrderOptions = purchaseOrders.map((po) => ({
    value: po._id,
    label: po.documentNumberPurchaseOrder ,
  }));

  // Load master data
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [prodRes, shadeRes, supRes, poRes] = await Promise.all([
          api.get("/items?limit=500", headers),
          api.get("/textiles/shade-card", headers),
          api.get("/suppliers?limit=500", headers),
          api.get("/purchase-order?limit=500", headers),
        ]);
        setProducts(prodRes.data.data || []);
        setShades(shadeRes.data.data || []);
        setSuppliers(supRes.data.data || []);
        setPurchaseOrders(poRes.data.data || []);
      } catch {
        toast.error("Failed to load master data");
      }
    };
    loadMasters();

    if (isEdit) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await api.get(`/textiles/lot-tracking/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = res.data.data;
          // Convert populated fields to ID for Select
          if (data.product && typeof data.product === 'object' && data.product._id) {
            data.product = data.product._id;
          }
          if (data.shade && typeof data.shade === 'object' && data.shade._id) {
            data.shade = data.shade._id;
          }
          if (data.supplier && typeof data.supplier === 'object' && data.supplier._id) {
            data.supplier = data.supplier._id;
          }
          if (data.purchaseOrder && typeof data.purchaseOrder === 'object' && data.purchaseOrder._id) {
            data.purchaseOrder = data.purchaseOrder._id;
          }
          // Format date
          if (data.receivedDate) {
            data.receivedDate = new Date(data.receivedDate).toISOString().split("T")[0];
          }
          setFormData(data);
        } catch {
          toast.error("Failed to load lot");
        } finally {
          setFetching(false);
        }
      };
      fetchData();
    } else {
      setFetching(false);
    }
  }, [id, isEdit]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (selected) => {
    const product = products.find((p) => p._id === selected?.value);
    setFormData((prev) => ({
      ...prev,
      product: selected ? selected.value : "",
      // Auto‑fill unit from product's unit (or uom)
      unit: selected && product?.unit ? product.unit : product?.uom || prev.unit || "",
    }));
  };

  const handleShadeChange = (selected) => {
    setFormData((prev) => ({ ...prev, shade: selected ? selected.value : "" }));
  };

  const handleSupplierChange = (selected) => {
    setFormData((prev) => ({ ...prev, supplier: selected ? selected.value : "" }));
  };

  const handlePurchaseOrderChange = (selected) => {
    setFormData((prev) => ({ ...prev, purchaseOrder: selected ? selected.value : "" }));
  };

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const method = isEdit ? "put" : "post";
      const url = isEdit ? `/textiles/lot-tracking/${id}` : "/textiles/lot-tracking";
      await api[method](url, formData, headers);
      toast.success(isEdit ? "Lot updated!" : "Lot created!");
      router.push("/admin/textiles/lot-tracking");
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
        {isEdit ? "Edit Lot" : "Create Lot"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lot Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Lot Number *</label>
          <input
            name="lotNumber"
            value={formData.lotNumber}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        {/* Product - Searchable */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Product</label>
          <Select
            options={productOptions}
            value={productOptions.find((opt) => opt.value === formData.product) || null}
            onChange={handleProductChange}
            placeholder="Search product..."
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
                backgroundColor: state.isFocused ? "#fef3c7" : "white",
                color: state.isFocused ? "#92400e" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Shade - Searchable */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Shade</label>
          <Select
            options={shadeOptions}
            value={shadeOptions.find((opt) => opt.value === formData.shade) || null}
            onChange={handleShadeChange}
            placeholder="Search shade..."
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
                backgroundColor: state.isFocused ? "#fef3c7" : "white",
                color: state.isFocused ? "#92400e" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit *</label>
            <input
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
        </div>

        {/* Supplier - Searchable */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Supplier</label>
          <Select
            options={supplierOptions}
            value={supplierOptions.find((opt) => opt.value === formData.supplier) || null}
            onChange={handleSupplierChange}
            placeholder="Search supplier..."
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
                backgroundColor: state.isFocused ? "#fef3c7" : "white",
                color: state.isFocused ? "#92400e" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Purchase Order - Searchable */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Purchase Order</label>
          <Select
            options={purchaseOrderOptions}
            value={purchaseOrderOptions.find((opt) => opt.value === formData.purchaseOrder) || null}
            onChange={handlePurchaseOrderChange}
            placeholder="Search purchase order..."
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
                backgroundColor: state.isFocused ? "#fef3c7" : "white",
                color: state.isFocused ? "#92400e" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Received Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Received Date</label>
          <input
            type="date"
            name="receivedDate"
            value={formData.receivedDate || ""}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        {/* Quality Grade */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Quality Grade</label>
          <input
            name="qualityGrade"
            value={formData.qualityGrade || ""}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status || "in-stock"}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
          >
            <option value="in-stock">In Stock</option>
            <option value="used">Used</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Saving..." : "Save"}
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