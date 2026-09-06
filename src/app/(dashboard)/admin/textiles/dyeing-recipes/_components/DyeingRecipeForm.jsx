// app/admin/textiles/dyeing-recipes/_components/DyeingRecipeForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes, FaPlus, FaTrash, FaEye, FaEdit } from "react-icons/fa";
import Select from "react-select";

export default function DyeingRecipeForm({ id, viewOnly = false }) {
  const router = useRouter();
  const isEdit = !!id && !viewOnly;
  const isView = !!id && viewOnly;

  const [formData, setFormData] = useState({
    recipeCode: "",
    product: "",
    shadeName: "",
    colorCode: "",
    machineType: "",
    liquorRatio: "",
    temperature: "",
    totalTimeMinutes: "",
    approvedBy: "",
    ingredients: [],
    processSteps: [],
    status: "draft",
  });

  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [shades, setShades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit || isView);

  const [ingredientInput, setIngredientInput] = useState({
    material: "",
    quantity: 0,
    unit: "",
    costPerUnit: 0,
    materialType: "chemical",
    stage: "",
    additionTime: "",
    temperature: "",
  });
  const [stepInput, setStepInput] = useState({
    step: "",
    description: "",
    temperature: "",
    duration: "",
  });

  const productOptions = products.map((p) => ({
    value: p._id,
    label: `${p.itemName} (${p.itemCode || p._id.slice(-4)})`,
  }));
  const materialOptions = materials.map((m) => ({
    value: m._id,
    label: `${m.itemName} (${m.itemCode || m._id.slice(-4)})`,
  }));
  const shadeOptions = shades.map((s) => ({
    value: s.name,
    label: `${s.name} (${s.code || s._id.slice(-4)})`,
  }));

  // Load master data
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [itemsRes, shadesRes] = await Promise.all([
          api.get("/items?limit=500", headers),
          api.get("/textiles/shade-card", headers),
        ]);
        const items = itemsRes.data.data || [];
        setProducts(items);
        setMaterials(items);
        setShades(shadesRes.data.data || []);
      } catch {
        toast.error("Failed to load master data");
      }
    };
    loadMasters();

    if (isEdit || isView) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await api.get(`/textiles/dyeing-recipes/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Handle populated fields: if product is an object, extract its _id
          const data = res.data.data;
          if (data.product && typeof data.product === 'object' && data.product._id) {
            data.product = data.product._id;
          }
          // Same for ingredients: if material is an object, keep it as object for display
          // We'll handle display in the render
          setFormData(data);
        } catch {
          toast.error("Failed to load recipe");
        } finally {
          setFetching(false);
        }
      };
      fetchData();
    } else {
      setFetching(false);
    }
  }, [id, isEdit, isView]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (selected) => {
    setFormData((prev) => ({ ...prev, product: selected ? selected.value : "" }));
  };

  const handleShadeChange = (selected) => {
    const shade = shades.find((s) => s.name === selected?.value);
    setFormData((prev) => ({
      ...prev,
      shadeName: selected ? selected.value : "",
      colorCode: selected && shade?.hexCode ? shade.hexCode : "",
    }));
  };

  const handleIngredientChange = (e) => {
    const { name, value } = e.target;
    setIngredientInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleIngredientMaterialChange = (selected) => {
    const material = materials.find((m) => m._id === selected?.value);
    setIngredientInput((prev) => ({
      ...prev,
      material: selected ? selected.value : "",
      costPerUnit: material?.unitPrice || 0,
    }));
  };

  const handleStepChange = (e) => {
    const { name, value } = e.target;
    setStepInput((prev) => ({ ...prev, [name]: value }));
  };

  const addIngredient = () => {
    if (!ingredientInput.material || !ingredientInput.quantity) {
      return toast.warn("Material and quantity are required");
    }
    const qty = parseFloat(ingredientInput.quantity) || 0;
    const cost = parseFloat(ingredientInput.costPerUnit) || 0;
    const newIng = {
      material: ingredientInput.material,
      quantity: qty,
      unit: ingredientInput.unit || "",
      costPerUnit: cost,
      totalCost: qty * cost,
      dosage: qty,
      dosageUom: ingredientInput.unit || "",
      materialType: ingredientInput.materialType,
      stage: ingredientInput.stage,
      additionTime: ingredientInput.additionTime,
      temperature: parseFloat(ingredientInput.temperature) || 0,
    };
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newIng],
    }));
    setIngredientInput({ material: "", quantity: 0, unit: "", costPerUnit: 0, materialType: "chemical", stage: "", additionTime: "", temperature: "" });
  };

  const removeIngredient = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const addProcessStep = () => {
    if (!stepInput.step) return toast.warn("Step name is required");
    setFormData((prev) => ({
      ...prev,
      processSteps: [
        ...prev.processSteps,
        {
          step: stepInput.step,
          description: stepInput.description || "",
          temperature: stepInput.temperature || "",
          duration: stepInput.duration || "",
        },
      ],
    }));
    setStepInput({ step: "", description: "", temperature: "", duration: "" });
  };

  const removeProcessStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      processSteps: prev.processSteps.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const method = isEdit ? "put" : "post";
      const url = isEdit ? `/textiles/dyeing-recipes/${id}` : "/textiles/dyeing-recipes";
      await api[method](url, formData, headers);
      toast.success(isEdit ? "Recipe updated!" : "Recipe created!");
      router.push("/admin/textiles/dyeing-recipes");
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const title = isView ? "View Dyeing Recipe" : isEdit ? "Edit Dyeing Recipe" : "Create Dyeing Recipe";

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{title}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipe Code & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Recipe Code *</label>
            <input
              name="recipeCode"
              value={formData.recipeCode || ""}
              onChange={handleChange}
              required
              readOnly={isView}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none read-only:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={formData.status || "draft"}
              onChange={handleChange}
              disabled={isView}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none disabled:bg-gray-50"
            >
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="obsolete">Obsolete</option>
            </select>
          </div>
        </div>

        {/* Product & Shade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Product *</label>
            <Select
              options={productOptions}
              value={productOptions.find((opt) => opt.value === formData.product) || null}
              onChange={handleProductChange}
              isDisabled={isView}
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
                  backgroundColor: state.isFocused ? "#f3e8ff" : "white",
                  color: state.isFocused ? "#6b21a8" : "#1f2937",
                }),
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Shade Name *</label>
            <Select
              options={shadeOptions}
              value={shadeOptions.find((opt) => opt.value === formData.shadeName) || null}
              onChange={handleShadeChange}
              isDisabled={isView}
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
                  backgroundColor: state.isFocused ? "#f3e8ff" : "white",
                  color: state.isFocused ? "#6b21a8" : "#1f2937",
                }),
              }}
            />
          </div>
        </div>

        {/* Color Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Color Code (Hex)</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="colorCode"
              value={formData.colorCode || "#000000"}
              onChange={handleChange}
              disabled={isView}
              className="w-12 h-12 p-1 border border-gray-200 rounded cursor-pointer"
            />
            <input
              name="colorCode"
              value={formData.colorCode || ""}
              onChange={handleChange}
              readOnly={isView}
              placeholder="#000000"
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none read-only:bg-gray-50"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Auto‑filled from Shade selection, or pick/type manually.</p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
          <h2 className="mb-3 text-sm font-bold text-purple-800">Process Parameters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="block text-sm font-medium text-gray-700">Machine Type</label><input name="machineType" value={formData.machineType || ""} onChange={handleChange} readOnly={isView} className="w-full p-3 border border-gray-200 rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Liquor Ratio</label><input name="liquorRatio" type="number" step="any" value={formData.liquorRatio || ""} onChange={handleChange} readOnly={isView} className="w-full p-3 border border-gray-200 rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Temperature (°C)</label><input name="temperature" type="number" step="any" value={formData.temperature || ""} onChange={handleChange} readOnly={isView} className="w-full p-3 border border-gray-200 rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Total Time (min)</label><input name="totalTimeMinutes" type="number" min="0" value={formData.totalTimeMinutes || ""} onChange={handleChange} readOnly={isView} className="w-full p-3 border border-gray-200 rounded-xl" /></div>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
          <div className="space-y-2">
            {formData.ingredients.map((ing, idx) => {
              // ✅ FIX: handle both ID string and populated object
              const materialId = typeof ing.material === 'object' ? ing.material._id : ing.material;
              const materialName = materials.find((m) => m._id === materialId)?.itemName ||
                                   (typeof ing.material === 'object' ? ing.material.itemName : ing.material);
              return (
                <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="flex-1 font-medium">{materialName}</span>
                  <span className="text-sm text-gray-600">{ing.dosage ?? ing.quantity} {ing.dosageUom || ing.unit}</span>
                  <span className="text-xs font-bold uppercase text-purple-600">{ing.materialType || "chemical"}</span>
                  <span className="text-xs text-gray-500">{ing.stage || "—"} · {ing.additionTime || "—"} · {ing.temperature || 0}°C</span>
                  <span className="text-sm text-gray-600">₹{ing.costPerUnit}/unit</span>
                  <span className="text-sm font-bold text-gray-800">₹{ing.totalCost}</span>
                  {!isView && (
                    <button type="button" onClick={() => removeIngredient(idx)} className="text-red-500 hover:text-red-700">
                      <FaTrash size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!isView && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
              <div className="sm:col-span-2">
                <Select
                  options={materialOptions}
                  value={materialOptions.find((opt) => opt.value === ingredientInput.material) || null}
                  onChange={handleIngredientMaterialChange}
                  placeholder="Search material..."
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
                placeholder="Qty *"
                value={ingredientInput.quantity}
                onChange={handleIngredientChange}
                className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
                required
              />
              <input
                name="unit"
                placeholder="Unit"
                value={ingredientInput.unit}
                onChange={handleIngredientChange}
                className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
              />
              <input
                name="costPerUnit"
                type="number"
                placeholder="Cost/unit"
                value={ingredientInput.costPerUnit}
                onChange={handleIngredientChange}
                className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
              />
              <select name="materialType" value={ingredientInput.materialType} onChange={handleIngredientChange} className="p-2 border border-gray-200 rounded-lg"><option value="dye">Dye</option><option value="chemical">Chemical</option><option value="other">Other</option></select>
              <input name="stage" placeholder="Stage" value={ingredientInput.stage} onChange={handleIngredientChange} className="p-2 border border-gray-200 rounded-lg" />
              <input name="additionTime" placeholder="Addition time" value={ingredientInput.additionTime} onChange={handleIngredientChange} className="p-2 border border-gray-200 rounded-lg" />
              <input name="temperature" type="number" placeholder="Temperature °C" value={ingredientInput.temperature} onChange={handleIngredientChange} className="p-2 border border-gray-200 rounded-lg" />
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center justify-center gap-1 bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition"
              >
                <FaPlus size={14} /> Add
              </button>
            </div>
          )}
        </div>

        {/* Total Cost */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Total Cost (auto)</label>
          <div className="p-3 bg-gray-100 rounded-xl font-bold text-lg text-purple-700">
            ₹{formData.ingredients.reduce((sum, i) => sum + (i.totalCost || 0), 0)}
          </div>
        </div>

        {/* Process Steps */}
  <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Process Steps</label>
  {/* List of existing steps */}
  <div className="space-y-2">
    {formData.processSteps.map((step, idx) => (
      <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="font-medium w-24">{step.step}</span>
        <span className="flex-1 text-sm text-gray-600">{step.description}</span>
        <span className="text-sm text-gray-600">{step.temperature}</span>
        <span className="text-sm text-gray-600">{step.duration}</span>
        {!isView && (
          <button type="button" onClick={() => removeProcessStep(idx)} className="text-red-500 hover:text-red-700">
            <FaTrash size={14} />
          </button>
        )}
      </div>
    ))}
  </div>

  {/* Add new step (only in Create/Edit mode) */}
  {!isView && (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-3">
      <input
        name="step"
        placeholder="Step *"
        value={stepInput.step}
        onChange={handleStepChange}
        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
      />
      <input
        name="description"
        placeholder="Description"
        value={stepInput.description}
        onChange={handleStepChange}
        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
      />
      <input
        name="temperature"
        placeholder="Temp (°C)"
        value={stepInput.temperature}
        onChange={handleStepChange}
        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
      />
      <input
        name="duration"
        placeholder="Duration (e.g., 30 min)"
        value={stepInput.duration}
        onChange={handleStepChange}
        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
      />
      <button
        type="button"
        onClick={addProcessStep}
        className="flex items-center justify-center gap-1 bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition"
      >
        <FaPlus size={14} /> Add Step
      </button>
    </div>
  )}
</div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          {!isView && (
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50"
            >
              <FaSave size={14} /> {loading ? "Saving..." : "Save"}
            </button>
          )}
          {isView && (
            <Link
              href={`/admin/textiles/dyeing-recipes/${id}/edit`}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
            >
              <FaEdit size={14} /> Edit
            </Link>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            <FaTimes size={14} /> {isView ? "Back" : "Cancel"}
          </button>
        </div>
      </form>
    </div>
  );
}
