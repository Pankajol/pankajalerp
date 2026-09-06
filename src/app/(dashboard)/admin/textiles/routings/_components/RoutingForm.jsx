// app/admin/textiles/routings/_components/RoutingForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import Select from "react-select";

export default function RoutingForm({ id }) {
  const router = useRouter();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    machineType: "",
    steps: [],
    status: "active",
  });
  const [operations, setOperations] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [stepInput, setStepInput] = useState({
    sequence: "",
    operation: "",
    machineType: "",
    standardTime: "",
    notes: "",
  });

  // --- react-select options ---
  const operationOptions = operations.map((op) => ({
    value: op.name || op.operationName || op._id,
    label: op.name || op.operationName || op._id,
  }));
  const machineOptions = machines.map((m) => ({
    value: m.name || m.machineName || m._id,
    label: m.name || m.machineName || m._id,
  }));

  // --- Load master data from PPC ---
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        // Adjust these endpoints to match your actual PPC API paths
        const [opsRes, macRes] = await Promise.all([
          api.get("/ppc/operations", headers),
          api.get("/ppc/machines", headers),
        ]);
        setOperations(opsRes.data.data || []);
        setMachines(macRes.data.data || []);
      } catch (err) {
        console.warn("Could not load PPC masters:", err.message);
        // Allow fallback to manual entry if APIs are not ready
      }
    };
    loadMasters();

    if (isEdit) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await api.get(`/textiles/routings/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFormData(res.data.data);
        } catch {
          toast.error("Failed to load routing");
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

  const handleStepChange = (e) => {
    const { name, value } = e.target;
    setStepInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleStepOperationChange = (selected) => {
    setStepInput((prev) => ({
      ...prev,
      operation: selected ? selected.value : "",
    }));
  };

  const handleStepMachineChange = (selected) => {
    setStepInput((prev) => ({
      ...prev,
      machineType: selected ? selected.value : "",
    }));
  };

  // --- Add Step (auto‑sequence) ---
  const addStep = () => {
    if (!stepInput.operation) {
      return toast.warn("Operation name is required");
    }
    const nextSeq = formData.steps.length + 1;
    const newStep = {
      sequence: parseInt(stepInput.sequence) || nextSeq,
      operation: stepInput.operation,
      machineType: stepInput.machineType || "",
      standardTime: parseFloat(stepInput.standardTime) || 0,
      notes: stepInput.notes || "",
    };
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
    setStepInput({ sequence: "", operation: "", machineType: "", standardTime: "", notes: "" });
  };

  // --- Remove Step ---
  const removeStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const method = isEdit ? "put" : "post";
      const url = isEdit ? `/textiles/routings/${id}` : "/textiles/routings";
      await api[method](url, formData, headers);
      toast.success(isEdit ? "Routing updated!" : "Routing created!");
      router.push("/admin/textiles/routings");
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        {isEdit ? "Edit Routing" : "Create Routing"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Code *</label>
          <input
            name="code"
            value={formData.code}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* Machine Type – searchable dropdown from PPC */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Machine Type</label>
          <Select
            options={machineOptions}
            value={machineOptions.find((opt) => opt.value === formData.machineType) || null}
            onChange={(selected) =>
              setFormData((prev) => ({ ...prev, machineType: selected ? selected.value : "" }))
            }
            placeholder="Search machine type..."
            isClearable
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
                backgroundColor: state.isFocused ? "#e0f2fe" : "white",
                color: state.isFocused ? "#0369a1" : "#1f2937",
              }),
            }}
          />
          <p className="text-xs text-gray-400 mt-1">Select from master list, or leave blank.</p>
        </div>

        {/* Steps */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Steps</label>
          <div className="space-y-2">
            {formData.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="font-mono text-xs text-gray-500 w-8">{step.sequence}</span>
                <span className="flex-1 font-medium">{step.operation}</span>
                <span className="text-sm text-gray-600">{step.machineType}</span>
                <span className="text-sm text-gray-600">{step.standardTime}m</span>
                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Step inputs – with searchable Operation & Machine */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            <input
              name="sequence"
              placeholder="Seq"
              value={stepInput.sequence}
              onChange={handleStepChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            />

            <div className="col-span-1">
              <Select
                options={operationOptions}
                value={operationOptions.find((opt) => opt.value === stepInput.operation) || null}
                onChange={handleStepOperationChange}
                placeholder="Operation *"
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
                    backgroundColor: state.isFocused ? "#e0f2fe" : "white",
                    color: state.isFocused ? "#0369a1" : "#1f2937",
                  }),
                }}
              />
            </div>

            <div className="col-span-1">
              <Select
                options={machineOptions}
                value={machineOptions.find((opt) => opt.value === stepInput.machineType) || null}
                onChange={handleStepMachineChange}
                placeholder="Machine"
                isClearable
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
                    backgroundColor: state.isFocused ? "#e0f2fe" : "white",
                    color: state.isFocused ? "#0369a1" : "#1f2937",
                  }),
                }}
              />
            </div>

            <input
              name="standardTime"
              placeholder="Time (min)"
              value={stepInput.standardTime}
              onChange={handleStepChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            />

            <button
              type="button"
              onClick={addStep}
              className="flex items-center justify-center gap-1 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition"
            >
              <FaPlus size={14} /> Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Sequence auto‑increments if left blank.</p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status || "active"}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
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