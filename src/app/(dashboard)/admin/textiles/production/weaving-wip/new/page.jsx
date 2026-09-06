"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";

export default function NewWeavingWIP() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    productionOrder: "",
    machine: "",
    operator: "",
    shift: "A",
    date: new Date().toISOString().split("T")[0],
    plannedQuantity: 0,
    producedQuantity: 0,
    waste: 0,
    downtime: 0,
    remarks: "",
    status: "draft",
  });
  const [productionOrders, setProductionOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [poRes, macRes, opRes] = await Promise.all([
          api.get("/ppc/production-orders?limit=100", headers),
          api.get("/machines", headers),
          api.get("/users?role=operator", headers),
        ]);
        setProductionOrders(poRes.data.data || []);
        setMachines(macRes.data.data || []);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.post("/textiles/weaving-wip", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Weaving entry created!");
      router.push("/admin/textiles/production/weaving-wip");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">New Weaving Entry</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Production Order *</label>
            <select
              name="productionOrder"
              value={formData.productionOrder}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">Select PO</option>
              {productionOrders.map((po) => (
                <option key={po._id} value={po._id}>
                  {po.orderNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Machine *</label>
            <select
              name="machine"
              value={formData.machine}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">Select Machine</option>
              {machines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Operator</label>
            <select
              name="operator"
              value={formData.operator}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">Select Operator</option>
              {operators.map((op) => (
                <option key={op._id} value={op._id}>
                  {op.name}
                </option>
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
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Planned Qty *</label>
            <input
              type="number"
              name="plannedQuantity"
              value={formData.plannedQuantity}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Produced Qty *</label>
            <input
              type="number"
              name="producedQuantity"
              value={formData.producedQuantity}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Waste</label>
            <input
              type="number"
              name="waste"
              value={formData.waste}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Downtime (minutes)</label>
          <input
            type="number"
            name="downtime"
            value={formData.downtime}
            onChange={handleChange}
            min="0"
            step="1"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={2}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Saving..." : "Create Entry"}
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