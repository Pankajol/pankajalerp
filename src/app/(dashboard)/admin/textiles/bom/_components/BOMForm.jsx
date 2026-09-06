// app/admin/textiles/bom/_components/BOMForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import Select from "react-select";

export default function BOMForm({ id }) {
  const router = useRouter();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    bomCode: "",
    bomType: "general",
    design: "",
    product: "",
    shade: "",
    wastePercent: 0,
    batchNo: "",
    components: [],
    operations: [],
    status: "draft",
  });
  const [products, setProducts] = useState([]);
  const [shades, setShades] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [compInput, setCompInput] = useState({
    item: "",
    quantity: 0,
    unit: "",
    wasteFactor: 0,
    notes: "",
    costPerUnit: 0,
    warehouse: "",
    batchRequired: false,
    scrapPercent: 0,
  });
  const [operationInput, setOperationInput] = useState({ operation: "", workstation: "", machine: "", timeMinutes: 0, hourlyRate: 0 });

  // --- react-select options ---
  const productOptions = products.map((p) => ({
    value: p._id,
    label: `${p.itemName} (${p.itemCode || p._id.slice(-4)})`,
  }));
  const shadeOptions = shades.map((s) => ({
    value: s._id,
    label: `${s.name} (${s.code || s._id.slice(-4)})`,
  }));
  const itemOptions = products.map((p) => ({
    value: p._id,
    label: `${p.itemName} (${p.itemCode || p._id.slice(-4)})`,
  }));
  const designOptions = designs.map((design) => ({
    value: design._id,
    label: `${design.designCode} - ${design.description}`,
  }));

  // Load master data
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [prodRes, shadeRes, designRes] = await Promise.all([
          api.get("/items?limit=500", headers),
          api.get("/textiles/shade-card", headers),
          api.get("/textiles/designs?status=active", headers),
        ]);
        setProducts(prodRes.data.data || []);
        setShades(shadeRes.data.data || []);
        setDesigns(designRes.data.data || []);
      } catch {
        toast.error("Failed to load master data");
      }
    };
    loadMasters();

    if (isEdit) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await api.get(`/textiles/bom/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = res.data.data;
          // Convert populated product/shade to their IDs for Select
          if (data.product && typeof data.product === 'object' && data.product._id) {
            data.product = data.product._id;
          }
          if (data.shade && typeof data.shade === 'object' && data.shade._id) {
            data.shade = data.shade._id;
          }
          if (data.design && typeof data.design === 'object' && data.design._id) {
            data.design = data.design._id;
          }
          setFormData(data);
        } catch {
          toast.error("Failed to load BOM");
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
    setFormData((prev) => ({ ...prev, product: selected ? selected.value : "" }));
  };

  const handleShadeChange = (selected) => {
    setFormData((prev) => ({ ...prev, shade: selected ? selected.value : "" }));
  };

  const handleCompChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompInput((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleItemChange = (selected) => {
    const item = products.find((p) => p._id === selected?.value);
    setCompInput((prev) => ({
      ...prev,
      item: selected ? selected.value : "",
      // Auto‑fill unit and costPerUnit from item
      unit: item?.unit || item?.uom || "",
      costPerUnit: item?.unitPrice || 0,
    }));
  };

  // --- Components ---
  const addComponent = () => {
    if (!compInput.item || !compInput.quantity) {
      return toast.warn("Item and quantity required");
    }
    const qty = parseFloat(compInput.quantity) || 0;
    const costPerUnit = parseFloat(compInput.costPerUnit) || 0;
    const newComp = {
      item: compInput.item,
      quantity: qty,
      unit: compInput.unit || "",
      wasteFactor: parseFloat(compInput.wasteFactor) || 0,
      notes: compInput.notes || "",
      // Cost fields (for display only, not saved in schema)
      costPerUnit: costPerUnit,
      totalCost: qty * costPerUnit,
      warehouse: compInput.warehouse,
      batchRequired: Boolean(compInput.batchRequired),
      scrapPercent: parseFloat(compInput.scrapPercent) || 0,
    };
    setFormData((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
    setCompInput({ item: "", quantity: 0, unit: "", wasteFactor: 0, notes: "", costPerUnit: 0, warehouse: "", batchRequired: false, scrapPercent: 0 });
  };

  const removeComponent = (index) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };
  const addOperation = () => {
    if (!operationInput.operation.trim()) return toast.warn("Operation is required");
    setFormData((prev) => ({ ...prev, operations: [...(prev.operations || []), { ...operationInput, timeMinutes: Number(operationInput.timeMinutes || 0), hourlyRate: Number(operationInput.hourlyRate || 0) }] }));
    setOperationInput({ operation: "", workstation: "", machine: "", timeMinutes: 0, hourlyRate: 0 });
  };
  const removeOperation = (index) => setFormData((prev) => ({ ...prev, operations: prev.operations.filter((_, rowIndex) => rowIndex !== index) }));

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const method = isEdit ? "put" : "post";
      const url = isEdit ? `/textiles/bom/${id}` : "/textiles/bom";
      // Remove cost fields before sending (they are not in schema)
      const payload = {
        ...formData,
        components: formData.components.map(({ costPerUnit, totalCost, ...rest }) => rest),
      };
      await api[method](url, payload, headers);
      toast.success(isEdit ? "BOM updated!" : "BOM created!");
      router.push("/admin/textiles/bom");
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Helper: get component display data ---
  const getComponentDisplay = (comp) => {
    // comp.item can be a string ID or a populated object
    let itemId = comp.item;
    let itemName = "";
    let itemUnit = "";
    let itemPrice = 0;

    if (typeof comp.item === 'object' && comp.item._id) {
      itemId = comp.item._id;
      itemName = comp.item.itemName || comp.item._id;
      itemUnit = comp.item.unit || comp.item.uom || "";
      itemPrice = comp.item.unitPrice || 0;
    } else {
      const found = products.find(p => p._id === comp.item);
      itemName = found?.itemName || comp.item || "Unknown";
      itemUnit = found?.unit || found?.uom || comp.unit || "";
      itemPrice = found?.unitPrice || 0;
    }

    // Use comp's values if available, else fallback to item's
    const qty = comp.quantity || 0;
    const unit = comp.unit || itemUnit;
    const costPerUnit = comp.costPerUnit || itemPrice;
    const totalCost = qty * costPerUnit;

    return { itemId, itemName, unit, costPerUnit, totalCost, qty, wasteFactor: comp.wasteFactor || 0 };
  };

  // --- Calculate total BOM cost ---
  const totalBOMCost = formData.components.reduce((sum, comp) => {
    const { totalCost } = getComponentDisplay(comp);
    return sum + totalCost;
  }, 0);

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        {isEdit ? "Edit Textile BOM" : "Create Textile BOM"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* BOM Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
          <label className="block text-sm font-medium text-gray-700">BOM Code *</label>
          <input
            name="bomCode"
            value={formData.bomCode}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Process-wise BOM Type</label><select name="bomType" value={formData.bomType || "general"} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl"><option value="knitting">Knitting (Yarn → Grey Fabric)</option><option value="dyeing">Dyeing (Grey → Dyed Fabric)</option><option value="printing">Printing</option><option value="finishing">Finishing</option><option value="general">General</option></select></div>
        </div>

        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Design *</label>
          <Select
            options={designOptions}
            value={designOptions.find((opt) => opt.value === formData.design) || null}
            onChange={(selected) => setFormData((prev) => ({ ...prev, design: selected?.value || "" }))}
            placeholder="Search design code or description..."
          />
        </div>

        {/* Product */}
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
                backgroundColor: state.isFocused ? "#e0e7ff" : "white",
                color: state.isFocused ? "#4f46e5" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Shade */}
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
                backgroundColor: state.isFocused ? "#e0e7ff" : "white",
                color: state.isFocused ? "#4f46e5" : "#1f2937",
              }),
            }}
          />
        </div>

        {/* Waste % & Batch */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Waste %</label>
            <input
              type="number"
              step="0.1"
              name="wastePercent"
              value={formData.wastePercent || 0}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Batch / Lot</label>
            <input
              name="batchNo"
              value={formData.batchNo || ""}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* Components */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Components</label>
          <div className="space-y-2">
            {formData.components.map((comp, idx) => {
              const { itemName, qty, unit, costPerUnit, totalCost, wasteFactor } = getComponentDisplay(comp);
              return (
                <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="flex-1 font-medium">{itemName}</span>
                  <span className="text-sm text-gray-600">{qty} {unit}</span>
                  <span className="text-sm text-gray-600">₹{costPerUnit}/unit</span>
                  <span className="text-sm font-bold text-gray-800">₹{totalCost}</span>
                  <span className="text-sm text-gray-500">Waste: {wasteFactor}%</span>
                  <span className="text-xs text-gray-500">Scrap: {comp.scrapPercent || 0}% · {comp.batchRequired ? "Batch required" : "No batch"}</span>
                  <button
                    type="button"
                    onClick={() => removeComponent(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-2 mt-2">
            <div className="col-span-2">
              <Select
                options={itemOptions}
                value={itemOptions.find((opt) => opt.value === compInput.item) || null}
                onChange={handleItemChange}
                placeholder="Search item..."
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
                }}
              />
            </div>
            <input
              name="quantity"
              type="number"
              placeholder="Qty"
              value={compInput.quantity}
              onChange={handleCompChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <input
              name="unit"
              placeholder="Unit"
              value={compInput.unit}
              onChange={handleCompChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            />
              <input
                name="costPerUnit"
              type="number"
              placeholder="Cost/unit"
              value={compInput.costPerUnit}
              onChange={handleCompChange}
                className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <input name="warehouse" placeholder="Warehouse" value={compInput.warehouse} onChange={handleCompChange} className="p-2 border border-gray-200 rounded-lg" />
              <input name="scrapPercent" type="number" min="0" step="any" placeholder="Scrap %" value={compInput.scrapPercent} onChange={handleCompChange} className="p-2 border border-gray-200 rounded-lg" />
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm"><input name="batchRequired" type="checkbox" checked={compInput.batchRequired} onChange={handleCompChange} /> Batch required</label>
            <button
              type="button"
              onClick={addComponent}
              className="flex items-center justify-center gap-1 bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-600 transition"
            >
              <FaPlus size={14} /> Add
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 p-4">
          <div className="mb-3 flex items-center justify-between"><div><label className="block text-sm font-bold text-gray-700">Operations</label><p className="text-xs text-gray-400">Operation, workstation, machine, time and hourly rate</p></div></div>
          <div className="space-y-2">{(formData.operations || []).map((operation, index) => <div key={index} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm"><strong>{operation.operation}</strong><span>{operation.workstation || "No workstation"}</span><span>{operation.machine || "No machine"}</span><span>{operation.timeMinutes || 0} min</span><span>₹{operation.hourlyRate || 0}/hr</span><button type="button" onClick={() => removeOperation(index)} className="ml-auto text-red-500"><FaTrash /></button></div>)}</div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5"><input placeholder="Operation *" value={operationInput.operation} onChange={(e) => setOperationInput((p) => ({ ...p, operation: e.target.value }))} className="p-2 border rounded-lg" /><input placeholder="Workstation" value={operationInput.workstation} onChange={(e) => setOperationInput((p) => ({ ...p, workstation: e.target.value }))} className="p-2 border rounded-lg" /><input placeholder="Machine" value={operationInput.machine} onChange={(e) => setOperationInput((p) => ({ ...p, machine: e.target.value }))} className="p-2 border rounded-lg" /><input type="number" placeholder="Time (min)" value={operationInput.timeMinutes} onChange={(e) => setOperationInput((p) => ({ ...p, timeMinutes: e.target.value }))} className="p-2 border rounded-lg" /><div className="flex gap-2"><input type="number" placeholder="Hourly rate" value={operationInput.hourlyRate} onChange={(e) => setOperationInput((p) => ({ ...p, hourlyRate: e.target.value }))} className="min-w-0 flex-1 p-2 border rounded-lg" /><button type="button" onClick={addOperation} className="rounded-lg bg-indigo-600 px-3 text-white"><FaPlus /></button></div></div>
        </div>

        {/* Total BOM Cost (display only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Total BOM Cost (approx)</label>
          <div className="p-3 bg-gray-100 rounded-xl font-bold text-lg text-indigo-700">
            ₹{totalBOMCost.toFixed(2)}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status || "draft"}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
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
