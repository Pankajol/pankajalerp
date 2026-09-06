"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { FaSave, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "@/lib/api";
import {
  EMPTY_TAKA, STATUS_OPTIONS, loadAllOptions, nextTakaNumber,
  normalizeTaka, takaPayload, toOptions, validateTaka,
} from "./taka-form-data";

const inputClass = "w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none";
const selectStyles = {
  control: (base, state) => ({ ...base, minHeight: 50, borderRadius: 12, borderColor: state.isFocused ? "#818cf8" : "#e5e7eb", boxShadow: state.isFocused ? "0 0 0 2px #c7d2fe" : "none" }),
  menu: (base) => ({ ...base, zIndex: 30 }),
};
const messageFor = (error, fallback) => error.response?.data?.message || error.response?.data?.error || error.message || fallback;

export default function TakaForm({ id }) {
  const editing = Boolean(id);
  const router = useRouter();
  const [formData, setFormData] = useState({ ...EMPTY_TAKA });
  const [options, setOptions] = useState({ productionOrder: [], lot: [], fabric: [], designRef: [], shade: [], warehouse: [] });
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [retry, setRetry] = useState(0);
  const saving = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setFetching(true);
      setLoadError("");
      setSaveError("");
      try {
        let record = {};
        if (editing) {
          const { data } = await api.get(`/textiles/takas/${id}`, { signal: controller.signal });
          if (!data?.success || !data.data?._id) throw new Error(data?.message || "Taka not found.");
          record = data.data;
        }
        const endpoints = {
          productionOrder: "/production-orders", lot: "/textiles/lot-tracking",
          fabric: "/items", designRef: "/textiles/designs?status=active",
          shade: "/textiles/shade-card", warehouse: "/warehouse",
        };
        const [entries, takas] = await Promise.all([
          Promise.all(Object.entries(endpoints).map(async ([field, url]) => [
            field, toOptions(await loadAllOptions(api, url, controller.signal), field, record[field]),
          ])),
          editing ? Promise.resolve([]) : loadAllOptions(api, "/textiles/takas", controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setOptions(Object.fromEntries(entries));
        setFormData(editing ? normalizeTaka(record) : { ...EMPTY_TAKA, takaNumber: nextTakaNumber(takas) });
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(messageFor(error, "Failed to load data. Please retry."));
      } finally {
        if (!controller.signal.aborted) setFetching(false);
      }
    }
    load();
    return () => controller.abort();
  }, [id, editing, retry]);

  const changeValue = (name, value) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
    setSaveError("");
  };
  const handleChange = ({ target: { name, value } }) => changeValue(name, value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving.current || fetching || loadError) return;
    const payload = takaPayload(formData);
    const validationError = validateTaka(payload);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    saving.current = true;
    setLoading(true);
    setSaveError("");
    try {
      const response = editing
        ? await api.put(`/textiles/takas/${id}`, payload)
        : await api.post("/textiles/takas", payload);
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to save taka.");
      toast.success(editing ? "Taka updated!" : "Taka created!");
      router.push("/admin/textiles/takas");
    } catch (error) {
      const message = messageFor(error, "Unable to save taka. Please try again.");
      setSaveError(message);
      toast.error(message);
    } finally {
      saving.current = false;
      setLoading(false);
    }
  };

  const searchable = (name, label, required = false) => {
    const choices = name === "status" ? STATUS_OPTIONS : options[name];
    return (
      <div className="min-w-0">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}{required ? " *" : ""}</label>
        <Select
          inputId={name}
          instanceId={`taka-${name}`}
          name={name}
          options={choices}
          value={choices.find((option) => option.value === formData[name]) || null}
          onChange={(option) => changeValue(name, option?.value || "")}
          isSearchable
          isClearable={!required && name !== "status"}
          isDisabled={loading}
          required={required}
          placeholder={`Search ${label.toLowerCase()}...`}
          noOptionsMessage={() => "No matching options"}
          styles={selectStyles}
          menuPlacement="auto"
        />
      </div>
    );
  };

  if (fetching) return <div role="status" className="p-6 text-center">Loading...</div>;
  if (loadError) return (
    <div role="alert" className="max-w-3xl mx-auto p-6 bg-white rounded-2xl border border-red-200">
      <p className="text-red-700">{loadError}</p>
      <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl">Retry</button>
      <button type="button" onClick={() => router.push("/admin/textiles/takas")} className="ml-3 px-4 py-2 rounded-xl bg-gray-100">Back to Takas</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{editing ? "Edit Taka" : "Create New Taka / Roll"}</h1>
      <form onSubmit={handleSubmit} aria-busy={loading}>
        <fieldset disabled={loading} className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="takaNumber" className="block text-sm font-medium text-gray-700">Taka Number *</label>
              <input id="takaNumber" name="takaNumber" value={formData.takaNumber} onChange={handleChange} required className={inputClass} />
              {!editing && <p className="text-xs text-gray-400 mt-1">Auto-generated, you can change it</p>}
            </div>
            {searchable("status", "Status")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchable("productionOrder", "Production Order", true)}
            {searchable("lot", "Lot")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchable("fabric", "Fabric", true)}
            {searchable("designRef", "Design", true)}
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[["quantity", "Length / Quantity (Mtr)", true], ["weight", "Weight (Kg)", false], ["width", "Width (cm/in)", false], ["gsm", "GSM", false]].map(([name, label, required]) => (
              <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}{required ? " *" : ""}</label>
                <input id={name} name={name} type="number" value={formData[name]} onChange={handleChange} min={required ? "0.01" : "0"} step="any" required={required} className={inputClass} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchable("shade", "Shade")}
            {searchable("warehouse", "Warehouse")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label htmlFor="fabricSpecification" className="block text-sm font-medium text-gray-700">Fabric Specification</label><input id="fabricSpecification" name="fabricSpecification" value={formData.fabricSpecification} onChange={handleChange} placeholder="Construction / specification reference" className={inputClass} /></div>
            <div><label htmlFor="color" className="block text-sm font-medium text-gray-700">Color</label><input id="color" name="color" value={formData.color} onChange={handleChange} className={inputClass} /></div>
            <div><label htmlFor="qualityGrade" className="block text-sm font-medium text-gray-700">Quality Grade</label><select id="qualityGrade" name="qualityGrade" value={formData.qualityGrade} onChange={handleChange} className={inputClass}><option value="">Not graded</option>{["A", "A-", "B", "C", "Reject"].map(grade => <option key={grade}>{grade}</option>)}</select></div>
            <div><label htmlFor="location" className="block text-sm font-medium text-gray-700">Rack / Bin</label><input id="location" name="location" value={formData.location} onChange={handleChange} className={inputClass} /></div>
          </div>
          {saveError && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-xl">{saveError}</p>}
          <div className="flex flex-wrap gap-4 pt-4">
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50">
              <FaSave size={14} /> {loading ? "Saving..." : editing ? "Update Taka" : "Create Taka"}
            </button>
            <button type="button" onClick={() => router.push("/admin/textiles/takas")} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">
              <FaTimes size={14} /> Cancel
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
