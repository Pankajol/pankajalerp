"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import Select from "react-select";

export default function NewQCInspection() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    taka: "",
    item: "",
    batch: "",
    length: "",
    width: "",
    gsm: "",
    grade: "",
    finalResult: "pending",
    scoringBasis: "per-length",
    scoringDivisor: 100,
    inspectedDate: new Date().toISOString().split("T")[0],
    parameters: [],
    defects: [],
    remarks: "",
    status: "draft",
  });
  const [takas, setTakas] = useState([]);
  const [qualityParams, setQualityParams] = useState([]);
  const [selectedTaka, setSelectedTaka] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Defect input state
  const [defectInput, setDefectInput] = useState({
    type: "",
    position: "",
    severity: "minor",
    quantity: 0,
    points: 0,
    remarks: "",
  });

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [takaRes, paramRes] = await Promise.all([
          api.get("/textiles/takas?status=available", headers),
          api.get("/textiles/quality-parameters", headers),
        ]);
        setTakas(takaRes.data.data || []);
        setQualityParams(paramRes.data.data || []);
        setFetching(false);
      } catch {
        toast.error("Failed to load master data");
        setFetching(false);
      }
    };
    loadMasters();
  }, []);

  const handleTakaChange = (selectedOption) => {
    const takaId = selectedOption ? selectedOption.value : "";
    setFormData((prev) => ({ ...prev, taka: takaId }));
    const taka = takas.find((t) => t._id === takaId);
    setSelectedTaka(taka);
    setFormData((prev) => ({ ...prev, taka: takaId, item: taka?.fabric?._id || taka?.fabric || "", batch: taka?.lot?.lotNumber || taka?.lot?._id || taka?.lot || "", length: taka?.quantity || taka?.length || "", width: taka?.width || "", gsm: taka?.gsm || "" }));

    // Use the parameters configured on the selected design when available.
    const designParameters = taka?.designRef?.qualityParameters;
    const applicableParameters = designParameters?.length ? designParameters : qualityParams;
    if (applicableParameters.length > 0) {
      const params = applicableParameters.map((p) => ({
        parameter: p._id,
        actualValue: 0,
        result: "pass",
        remarks: "",
      }));
      setFormData((prev) => ({ ...prev, design: taka?.designRef?._id || "", parameters: params }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleParamChange = (index, field, value) => {
    const newParams = [...formData.parameters];
    newParams[index][field] = value;
    setFormData((prev) => ({ ...prev, parameters: newParams }));
  };

  const handleDefectChange = (e) => {
    const { name, value } = e.target;
    setDefectInput((prev) => ({ ...prev, [name]: value }));
  };

  const addDefect = () => {
    if (!defectInput.type) return toast.warn("Defect type is required");
    setFormData((prev) => ({
      ...prev,
      defects: [...prev.defects, { ...defectInput }],
    }));
    setDefectInput({ type: "", position: "", severity: "minor", quantity: 0, points: 0, remarks: "" });
  };

  const removeDefect = (index) => {
    setFormData((prev) => ({
      ...prev,
      defects: prev.defects.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taka) return toast.warn("Please select a Taka");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.post("/textiles/qc-inspections", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Inspection created!");
      router.push("/admin/textiles/quality-inspection");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  const takaOptions = takas.map((t) => ({
    value: t._id,
    label: `${t.takaNumber} – ${t.fabric?.itemName} (${t.quantity} Mtr)`,
  }));

  const defectOptions = [
    "hole",
    "stain",
    "slub",
    "oil-mark",
    "missing-yarn",
    "broken-yarn",
    "shade-variation",
    "crease",
    "crease-mark",
    "weft-bow",
    "selvedge-defect",
    "other",
  ];
  const totalPoints = formData.defects.reduce((sum, defect) => sum + Number(defect.points || 0), 0);
  const scoringBase = formData.scoringBasis === "per-area" ? Number(formData.length || 0) * Number(formData.width || 0) : Number(formData.length || 0);
  const inspectionScore = scoringBase > 0 ? (totalPoints * Number(formData.scoringDivisor || 100)) / scoringBase : 0;

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">New QC Inspection</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Taka */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Taka *</label>
          <Select
            options={takaOptions}
            onChange={handleTakaChange}
            placeholder="Select Taka for inspection..."
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "0.75rem",
                borderColor: "#e5e7eb",
                "&:hover": { borderColor: "#93c5fd" },
              }),
            }}
          />
          {selectedTaka && (
            <div className="mt-2 p-3 bg-purple-50 rounded-lg text-sm">
              <p><strong>Taka:</strong> {selectedTaka.takaNumber}</p>
              <p><strong>Fabric:</strong> {selectedTaka.fabric?.itemName}</p>
              <p><strong>Quantity:</strong> {selectedTaka.quantity} Mtr</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
          <label className="block text-sm font-medium text-gray-700">Inspection Date</label>
          <input
            type="date"
            name="inspectedDate"
            value={formData.inspectedDate}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
          />
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Length</label><input type="number" step="any" name="length" value={formData.length} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl" /></div>
          <div><label className="block text-sm font-medium text-gray-700">Width</label><input type="number" step="any" name="width" value={formData.width} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl" /></div>
          <div><label className="block text-sm font-medium text-gray-700">GSM</label><input type="number" step="any" name="gsm" value={formData.gsm} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl" /></div>
        </div>

        {/* Quality Parameters */}
        {formData.parameters.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Parameters
            </label>
            <div className="space-y-2">
              {formData.parameters.map((param, idx) => {
                const p = qualityParams.find((qp) => qp._id === param.parameter);
                return (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-medium w-32 text-sm">{p?.name}</span>
                    <span className="text-xs text-gray-400 w-20">
                      {p?.minValue}–{p?.maxValue} {p?.unit}
                    </span>
                    <input
                      type="number"
                      placeholder="Actual"
                      value={param.actualValue}
                      onChange={(e) => handleParamChange(idx, "actualValue", parseFloat(e.target.value))}
                      className="w-20 p-1 border border-gray-300 rounded"
                      step="0.01"
                    />
                    <select
                      value={param.result}
                      onChange={(e) => handleParamChange(idx, "result", e.target.value)}
                      className="p-1 border border-gray-300 rounded"
                    >
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Defects */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Defects</label>
          <div className="space-y-2">
            {formData.defects.map((defect, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                <span className="font-bold text-sm text-red-600">{defect.type}</span>
                <span className="text-sm text-gray-600">{defect.position}</span>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                  defect.severity === "critical" ? "bg-red-200 text-red-700" :
                  defect.severity === "major" ? "bg-amber-200 text-amber-700" :
                  "bg-gray-200 text-gray-700"
                }`}>
                  {defect.severity}
                </span>
                <span className="text-sm text-gray-600">{defect.quantity} Mtr</span>
                <span className="text-sm font-bold text-red-700">{defect.points || 0} pts</span>
                <button
                  type="button"
                  onClick={() => removeDefect(idx)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
            <select
              name="type"
              value={defectInput.type}
              onChange={handleDefectChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
            >
              <option value="">Defect Type</option>
              {defectOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input
              name="position"
              placeholder="Position"
              value={defectInput.position}
              onChange={handleDefectChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
            />
            <select
              name="severity"
              value={defectInput.severity}
              onChange={handleDefectChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
            <input
              name="quantity"
              type="number"
              placeholder="Qty (Mtr)"
              value={defectInput.quantity}
              onChange={handleDefectChange}
              className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
            />
            <input name="points" type="number" min="0" step="any" placeholder="4-point score" value={defectInput.points} onChange={handleDefectChange} className="p-2 border border-gray-200 rounded-lg" />
            <button
              type="button"
              onClick={addDefect}
              className="flex items-center justify-center gap-1 bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition"
            >
              <FaPlus size={14} /> Add
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><label className="block text-sm font-medium text-gray-700">Scoring Basis</label><select name="scoringBasis" value={formData.scoringBasis} onChange={handleChange} className="w-full p-3 border rounded-xl"><option value="per-length">Per Length</option><option value="per-area">Per Area</option></select></div><div><label className="block text-sm font-medium text-gray-700">Score Multiplier</label><input name="scoringDivisor" type="number" value={formData.scoringDivisor} onChange={handleChange} className="w-full p-3 border rounded-xl" /></div><div><label className="block text-sm font-medium text-gray-700">Total Points</label><div className="p-3 rounded-xl bg-white font-bold">{totalPoints.toFixed(2)}</div></div><div><label className="block text-sm font-medium text-gray-700">Inspection Score</label><div className="p-3 rounded-xl bg-white font-bold text-purple-700">{inspectionScore.toFixed(2)}</div></div></div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="block text-sm font-medium text-gray-700">Quality Grade</label><select name="grade" value={formData.grade} onChange={handleChange} className="w-full p-3 border rounded-xl"><option value="">Select grade</option>{["A", "A-", "B", "C", "D", "Reject"].map(grade => <option key={grade}>{grade}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700">Inspection Result</label><select name="finalResult" value={formData.finalResult} onChange={handleChange} className="w-full p-3 border rounded-xl"><option value="pending">Pending</option><option value="pass">Passed</option><option value="fail">Failed</option><option value="hold">Hold</option><option value="rework">Rework</option></select></div></div>
        </div>

        {/* Remarks */}
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

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Creating..." : "Create Inspection"}
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
