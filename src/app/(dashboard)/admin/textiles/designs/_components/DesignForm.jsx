"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { toast } from "react-toastify";
import api from "@/lib/api";

const emptyForm = {
  designCode: "",
  description: "",
  fabric: "",
  category: "",
  weaveType: "",
  colors: "",
  imageUrl: "",
  qualityParameters: [],
  notes: "",
  status: "active",
};

export default function DesignForm({ id }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const requests = [
          api.get("/items?limit=500", config),
          api.get("/textiles/quality-parameters", config),
        ];
        if (id) requests.push(api.get(`/textiles/designs/${id}`, config));
        const [itemRes, parameterRes, designRes] = await Promise.all(requests);
        setItems(itemRes.data?.data || []);
        setParameters(parameterRes.data?.data || []);
        if (designRes) {
          const design = designRes.data.data;
          setForm({
            ...emptyForm,
            ...design,
            fabric: design.fabric?._id || design.fabric || "",
            colors: (design.colors || []).join(", "),
            qualityParameters: (design.qualityParameters || []).map(
              (item) => item._id || item
            ),
          });
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to load design form"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item._id,
        label: `${item.itemCode || "—"} - ${item.itemName}`,
      })),
    [items]
  );
  const parameterOptions = useMemo(
    () =>
      parameters.map((parameter) => ({
        value: parameter._id,
        label: `${parameter.code} - ${parameter.name}`,
      })),
    [parameters]
  );
  const inputClass =
    "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...form,
        fabric: form.fabric || null,
        colors: form.colors
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      if (id) await api.put(`/textiles/designs/${id}`, payload, config);
      else await api.post("/textiles/designs", payload, config);
      toast.success(id ? "Design updated" : "Design created");
      router.push("/admin/textiles/designs");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save design");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading...</div>;
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {id ? "Edit Design" : "New Design"}
          </h1>
          <p className="text-sm text-gray-500">
            One master record for BOM, production, job work, QC and costing.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Design code *
            <input
              className={inputClass}
              value={form.designCode}
              onChange={(e) => setForm({ ...form, designCode: e.target.value })}
              required
            />
          </label>
          <label className="text-sm font-medium">
            Category
            <input
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium">
            Fabric
            <Select
              className="mt-1"
              options={itemOptions}
              isClearable
              value={
                itemOptions.find((item) => item.value === form.fabric) || null
              }
              onChange={(item) =>
                setForm({ ...form, fabric: item?.value || "" })
              }
            />
          </label>
          <label className="text-sm font-medium">
            Weave type
            <input
              className={inputClass}
              value={form.weaveType}
              onChange={(e) => setForm({ ...form, weaveType: e.target.value })}
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Description *
          <textarea
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Quality parameters
          <Select
            className="mt-1"
            options={parameterOptions}
            isMulti
            value={parameterOptions.filter((item) =>
              form.qualityParameters.includes(item.value)
            )}
            onChange={(items) =>
              setForm({
                ...form,
                qualityParameters: items.map((item) => item.value),
              })
            }
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Colors (comma separated)
            <input
              className={inputClass}
              value={form.colors}
              onChange={(e) => setForm({ ...form, colors: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium">
            Image URL
            <input
              className={inputClass}
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium">
            Status
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Notes
          <textarea
            className={inputClass}
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <div className="flex gap-3 border-t pt-5">
          <button
            disabled={saving}
            className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Design"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl bg-gray-100 px-6 py-3 font-bold text-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
