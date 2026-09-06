"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";

export default function NewCosting() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    taka: "",
    productionOrder: "",
    design: "",
    sellingPrice: 0,
    totalQty: 0,
    unit: "Mtr",
    costBreakdown: [],
    status: "draft",
    remarks: "",
  });
  const [takas, setTakas] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [breakdownInput, setBreakdownInput] = useState({
    category: "material",
    description: "",
    amount: 0,
    rate: 0,
    quantity: 0,
    unit: "",
    source: "",
    reference: "",
    allocationBasis: "",
  });

  const netCost = formData.costBreakdown.reduce(
    (sum, item) => sum + (item.category === "by-product" ? -Number(item.recoveryValue || item.amount || 0) : Number(item.amount || 0)),
    0
  );

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [takaRes, poRes] = await Promise.all([
          api.get("/textiles/takas", headers),
          api.get("/ppc/production-orders?limit=100", headers),
        ]);
        setTakas(takaRes.data.data || []);
        setProductionOrders(poRes.data.data || []);
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

  const handleTakaChange = (e) => {
    const takaId = e.target.value;
    setFormData((prev) => ({ ...prev, taka: takaId }));
    const taka = takas.find((t) => t._id === takaId);
    if (taka) {
      setFormData((prev) => ({
        ...prev,
        productionOrder: taka.productionOrder?._id || "",
        design: taka.designRef?._id || "",
        totalQty: taka.quantity || 0,
      }));
    }
  };

  const handleBreakdownChange = (e) => {
    const { name, value } = e.target;
    setBreakdownInput((prev) => ({ ...prev, [name]: value }));
  };

  const addBreakdown = () => {
    const computedAmount = Number(breakdownInput.amount) || Number(breakdownInput.rate) * Number(breakdownInput.quantity);
    if (!breakdownInput.category || !computedAmount) {
      return toast.warn("Category and amount are required");
    }
    const referenceKey = {
      material: "item", labor: "employeeOrSkill", machine: "machine",
      jobwork: "jobWorker", utility: "utility", overhead: "costCenter",
    }[breakdownInput.category];
    setFormData((prev) => ({
      ...prev,
      costBreakdown: [
        ...prev.costBreakdown,
        {
          category: breakdownInput.category,
          description: breakdownInput.description || "",
          amount: computedAmount,
          rate: parseFloat(breakdownInput.rate) || 0,
          quantity: parseFloat(breakdownInput.quantity) || 0,
          unit: breakdownInput.unit || "",
          source: breakdownInput.source || "",
          allocationBasis: breakdownInput.allocationBasis || "",
          recoveryValue: breakdownInput.category === "by-product" ? computedAmount : 0,
          ...(referenceKey ? { [referenceKey]: breakdownInput.reference || "" } : {}),
        },
      ],
    }));
    setBreakdownInput({
      category: "material",
      description: "",
      amount: 0,
      rate: 0,
      quantity: 0,
      unit: "",
      source: "",
      reference: "",
      allocationBasis: "",
    });
  };

  const removeBreakdown = (index) => {
    setFormData((prev) => ({
      ...prev,
      costBreakdown: prev.costBreakdown.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.costBreakdown.length === 0) {
      return toast.warn("Please add at least one cost breakdown item");
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.post("/textiles/costing", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Costing created!");
      router.push("/admin/textiles/costing");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  const categoryColors = {
    material: "bg-blue-50 border-blue-200",
    labor: "bg-purple-50 border-purple-200",
    overhead: "bg-amber-50 border-amber-200",
    jobwork: "bg-orange-50 border-orange-200",
    waste: "bg-red-50 border-red-200",
    machine: "bg-cyan-50 border-cyan-200",
    utility: "bg-teal-50 border-teal-200",
    "by-product": "bg-emerald-50 border-emerald-200",
  };

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Create Production Costing</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Taka</label>
            <select
              name="taka"
              value={formData.taka}
              onChange={handleTakaChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
            >
              <option value="">Select Taka</option>
              {takas.map((t) => (
                <option key={t._id} value={t._id}>{t.takaNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Production Order</label>
            <select
              name="productionOrder"
              value={formData.productionOrder}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
            >
              <option value="">Select PO</option>
              {productionOrders.map((po) => (
                <option key={po._id} value={po._id}>{po.orderNumber}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Design</label>
            <input value={takas.find((t) => t._id === formData.taka)?.designRef?.designCode || "Select a taka"} readOnly className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Selling Value</label>
            <input type="number" name="sellingPrice" min="0" step="0.01" value={formData.sellingPrice} onChange={handleChange} className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Quantity</label>
            <input
              type="number"
              name="totalQty"
              value={formData.totalQty}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
            >
              <option value="Mtr">Mtr</option>
              <option value="Kg">Kg</option>
              <option value="Pcs">Pcs</option>
              <option value="Yard">Yard</option>
            </select>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Cost Breakdown</label>
          </div>
          <div className="space-y-2">
            {formData.costBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-3 rounded-lg border ${categoryColors[item.category] || "bg-gray-50 border-gray-200"}`}
              >
                <span className="text-xs font-bold uppercase text-gray-500 w-20">{item.category}</span>
                <span className="flex-1 text-sm text-gray-700">{item.description || "—"}</span>
                <span className="font-bold text-gray-800">₹{item.amount.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => removeBreakdown(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 mt-2 md:grid-cols-4">
            <select
              name="category"
              value={breakdownInput.category}
              onChange={handleBreakdownChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
            >
              <option value="material">Material</option>
              <option value="labor">Labour</option>
              <option value="machine">Machine</option>
              <option value="overhead">Overhead</option>
              <option value="jobwork">Job Work</option>
              <option value="waste">Waste</option>
              <option value="utility">Utilities</option>
              <option value="by-product">By-product Recovery</option>
            </select>
            <input
              name="description"
              placeholder="Description"
              value={breakdownInput.description}
              onChange={handleBreakdownChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
            />
            <input
              name="amount"
              type="number"
              placeholder="Amount"
              value={breakdownInput.amount}
              onChange={handleBreakdownChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
            />
            <input name="reference" placeholder="Item / skill / machine / party" value={breakdownInput.reference} onChange={handleBreakdownChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
            <input name="quantity" type="number" min="0" step="0.01" placeholder="Quantity" value={breakdownInput.quantity} onChange={handleBreakdownChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
            <input name="rate" type="number" min="0" step="0.01" placeholder="Rate" value={breakdownInput.rate} onChange={handleBreakdownChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
            <input name="unit" placeholder="UOM" value={breakdownInput.unit} onChange={handleBreakdownChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
            <input name="source" placeholder="Source document" value={breakdownInput.source} onChange={handleBreakdownChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
            <input name="allocationBasis" placeholder="Allocation basis" value={breakdownInput.allocationBasis} onChange={handleBreakdownChange} className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400" />
            <button
              type="button"
              onClick={addBreakdown}
              className="flex items-center justify-center gap-1 bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition"
            >
              <FaPlus size={14} /> Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        {/* Cost Summary */}
        {formData.costBreakdown.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-700 mb-2">Cost Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span className="text-gray-500">Total Cost:</span>
                <span className="font-bold ml-2 text-lg text-green-600">
                  ₹{formData.costBreakdown.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Cost / {formData.unit}:</span>
                <span className="font-bold ml-2">
                  ₹{(formData.totalQty > 0 ? formData.costBreakdown.reduce((sum, i) => sum + i.amount, 0) / formData.totalQty : 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Items:</span>
                <span className="font-bold ml-2">{formData.costBreakdown.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Margin:</span>
                <span className="font-bold ml-2">₹{(Number(formData.sellingPrice || 0) - formData.costBreakdown.reduce((sum, item) => sum + item.amount, 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Saving..." : "Create Costing"}
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
