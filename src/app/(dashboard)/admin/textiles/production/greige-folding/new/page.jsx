"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";

export default function NewGreigeFolding() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    productionOrder: "",
    machine: "",
    lot: "",
    shift: "A",
    date: new Date().toISOString().split("T")[0],
    operator: "",
    totalMeters: 0,
    totalWeight: 0,
    width: 0,
    takas: [{ takaNumber: "", meters: "", weight: "", width: "", remarks: "" }],
    waste: 0,
    remarks: "",
    status: "draft",
  });
  const [productionOrders, setProductionOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [lots, setLots] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [takaPrefix, setTakaPrefix] = useState("GT");

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [poRes, macRes, lotRes, opRes] = await Promise.all([
          api.get("/ppc/production-orders?limit=100", headers),
          api.get("/machines", headers),
          api.get("/textiles/lot-tracking", headers),
          api.get("/users?role=operator", headers),
        ]);
        setProductionOrders(poRes.data.data || []);
        setMachines(macRes.data.data || []);
        setLots(lotRes.data.data || []);
        setOperators(opRes.data.data || []);
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

  const handleTakaChange = (index, field, value) => {
    const newTakas = [...formData.takas];
    newTakas[index][field] = value;
    setFormData((prev) => ({ ...prev, takas: newTakas }));
    // Auto-update total meters
    const total = newTakas.reduce((sum, t) => sum + (parseFloat(t.meters) || 0), 0);
    setFormData((prev) => ({ ...prev, totalMeters: total }));
  };

  const addTakaRow = () => {
    setFormData((prev) => ({
      ...prev,
      takas: [
        ...prev.takas,
        { takaNumber: "", meters: "", weight: "", width: "", remarks: "" },
      ],
    }));
  };

  const removeTakaRow = (index) => {
    const newTakas = formData.takas.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, takas: newTakas }));
    const total = newTakas.reduce((sum, t) => sum + (parseFloat(t.meters) || 0), 0);
    setFormData((prev) => ({ ...prev, totalMeters: total }));
  };

  const generateTakaNumbers = () => {
    const prefix = takaPrefix || "GT";
    const baseNumber = formData.takas.length;
    const newTakas = formData.takas.map((t, idx) => {
      if (!t.takaNumber) {
        return { ...t, takaNumber: `${prefix}${String(baseNumber + idx + 1).padStart(2, "0")}` };
      }
      return t;
    });
    setFormData((prev) => ({ ...prev, takas: newTakas }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.takas.some((t) => !t.takaNumber || !t.meters)) {
      return toast.warn("All Taka rows must have number and meters");
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.post("/textiles/greige-folding", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Folding entry created!");
      router.push("/admin/textiles/production/greige-folding");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">New Greige Folding</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Production Order *</label>
            <select
              name="productionOrder"
              value={formData.productionOrder}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
            >
              <option value="">Select PO</option>
              {productionOrders.map((po) => (
                <option key={po._id} value={po._id}>{po.orderNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Machine</label>
            <select
              name="machine"
              value={formData.machine}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
            >
              <option value="">Select Machine</option>
              {machines.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Lot</label>
            <select
              name="lot"
              value={formData.lot}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
            >
              <option value="">Select Lot</option>
              {lots.map((l) => (
                <option key={l._id} value={l._id}>{l.lotNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Shift *</label>
            <select
              name="shift"
              value={formData.shift}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
            >
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Operator</label>
            <select
              name="operator"
              value={formData.operator}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
            >
              <option value="">Select Operator</option>
              {operators.map((op) => (
                <option key={op._id} value={op._id}>{op.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Meters (auto)</label>
            <input
              type="number"
              name="totalMeters"
              value={formData.totalMeters}
              readOnly
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Weight (Kg)</label>
            <input
              type="number"
              name="totalWeight"
              value={formData.totalWeight}
              onChange={handleChange}
              step="0.01"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
            />
          </div>
        </div>

        {/* Taka Rows */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Takas / Rolls</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={takaPrefix}
                onChange={(e) => setTakaPrefix(e.target.value)}
                placeholder="Prefix"
                className="w-20 p-1 border border-gray-200 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={generateTakaNumbers}
                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-200"
              >
                Auto Generate
              </button>
              <button
                type="button"
                onClick={addTakaRow}
                className="flex items-center gap-1 text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-200"
              >
                <FaPlus size={10} /> Add Row
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {formData.takas.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  placeholder="Taka #"
                  value={t.takaNumber}
                  onChange={(e) => handleTakaChange(idx, "takaNumber", e.target.value)}
                  className="w-24 p-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Mtr"
                  value={t.meters}
                  onChange={(e) => handleTakaChange(idx, "meters", e.target.value)}
                  className="w-20 p-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Kg"
                  value={t.weight}
                  onChange={(e) => handleTakaChange(idx, "weight", e.target.value)}
                  className="w-20 p-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Width"
                  value={t.width}
                  onChange={(e) => handleTakaChange(idx, "width", e.target.value)}
                  className="w-20 p-1 border border-gray-300 rounded text-sm"
                />
                <input
                  placeholder="Remarks"
                  value={t.remarks}
                  onChange={(e) => handleTakaChange(idx, "remarks", e.target.value)}
                  className="flex-1 p-1 border border-gray-300 rounded text-sm"
                />
                {formData.takas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTakaRow(idx)}
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
          <label className="block text-sm font-medium text-gray-700">Waste (Mtr)</label>
          <input
            type="number"
            name="waste"
            value={formData.waste}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Approved will create Taka records</p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Saving..." : "Create Folding"}
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