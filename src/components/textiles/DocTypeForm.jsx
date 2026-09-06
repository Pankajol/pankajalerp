"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import Select from "react-select";
import api from "@/lib/api";
import {
  getStatusOptions,
  textileDoctypes,
} from "@/lib/textiles/doctypeConfig";

const controlClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";
const linkCache = new Map();
const linkSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 12,
    borderColor: state.isFocused ? "#818cf8" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 2px #e0e7ff" : "none",
    "&:hover": { borderColor: state.isFocused ? "#818cf8" : "#cbd5e1" },
  }),
  menu: (base) => ({ ...base, zIndex: 40 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};
const linkSources = {
  Item: "/items?limit=500",
  "Item / Fiber Master": "/items?limit=500",
  Customer: "/customers?limit=500",
  Supplier: "/suppliers?limit=500",
  Warehouse: "/warehouse?limit=500",
  Employee: "/hr/employees?limit=500",
  User: "/users?limit=500",
  "Sales Order": "/sales-order?limit=500",
  Color: "/textiles/doctypes/color",
  Shade: "/textiles/doctypes/shade",
  "Fabric Construction": "/textiles/doctypes/fabric-construction",
  "Fabric Specification": "/textiles/doctypes/fabric-specification",
  "Fiber / Composition Master": "/textiles/doctypes/fiber-composition-master",
  Skill: "/textiles/doctypes/skill",
  Machine: "/textiles/doctypes/machine",
  "Textile Process": "/textiles/doctypes/textile-process",
  "Textile Production Plan": "/textiles/doctypes/textile-production-plan",
  "Production Batch": "/textiles/doctypes/production-batch",
  "Dyeing Recipe": "/textiles/doctypes/dyeing-recipe",
  "Fabric Roll": "/textiles/doctypes/fabric-roll",
  "Fabric Defect": "/textiles/doctypes/fabric-defect",
  "Lab Dip": "/textiles/doctypes/lab-dip",
  "Job Work Order": "/textiles/doctypes/job-work-order",
  "Fabric Inspection": "/textiles/doctypes/fabric-inspection",
};

const staticLinkOptions = {
  UOM: [
    { _id: "KG", name: "Kilogram (KG)" },
    { _id: "GM", name: "Gram (GM)" },
    { _id: "MTP", name: "Metric Ton (MTP)" },
    { _id: "MTR", name: "Meter (MTR)" },
    { _id: "CM", name: "Centimeter (CM)" },
    { _id: "MM", name: "Millimeter (MM)" },
    { _id: "IN", name: "Inch (IN)" },
    { _id: "YD", name: "Yard (YD)" },
    { _id: "SQM", name: "Square Meter (SQM)" },
    { _id: "PC", name: "Piece (PC)" },
    { _id: "ROLL", name: "Roll (ROLL)" },
    { _id: "CONE", name: "Cone (CONE)" },
    { _id: "LTR", name: "Liter (LTR)" },
    { _id: "ML", name: "Milliliter (ML)" },
    { _id: "BALE", name: "Bale (BALE)" },
    { _id: "CARTON", name: "Carton (CARTON)" },
  ],
};

function emptyData(fields) {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === "table"
        ? []
        : field.type === "checkbox"
        ? Boolean(field.default)
        : field.default || "",
    ])
  );
}

function LinkControl({ field, value, disabled, onChange }) {
  const listId = useId();
  const [options, setOptions] = useState([]);
  useEffect(() => {
    const staticOptions = staticLinkOptions[field.link];
    if (staticOptions) {
      setOptions(staticOptions);
      return;
    }
    const endpoint = linkSources[field.link];
    if (!endpoint) {
      setOptions([]);
      return;
    }
    if (!linkCache.has(endpoint)) {
      const headers = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };
      linkCache.set(
        endpoint,
        api
          .get(endpoint, headers)
          .then(
            (response) =>
              response.data.data ||
              response.data.items ||
              response.data.orders ||
              []
          )
      );
    }
    linkCache
      .get(endpoint)
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [disabled, field.link]);
  const label = (item) => {
    if (
      ["Item", "Item / Fiber Master"].includes(field.link) &&
      (item.itemCode || item.itemName)
    ) {
      return [item.itemCode, item.itemName].filter(Boolean).join(" - ");
    }
    return (
      item.documentNumber ||
      item.customerName ||
      item.supplierName ||
      item.warehouseName ||
      item.employeeName ||
      item.orderNumber ||
      item.name ||
      item.email ||
      item.data?.color_name ||
      item.data?.shade_name ||
      Object.values(item.data || {}).find(
        (entry) => typeof entry === "string"
      ) ||
      item.itemName ||
      item._id
    );
  };
  const selectOptions = options.map((item) => ({
    value: String(item._id),
    label: label(item),
  }));
  const selectedId = typeof value === "object" ? value?._id : value;
  const selected =
    selectOptions.find((option) => option.value === String(selectedId || "")) ||
    null;
  return (
    <div>
      <Select
        inputId={listId}
        instanceId={listId}
        options={selectOptions}
        value={selected}
        isDisabled={disabled}
        isSearchable
        isClearable={!field.required}
        menuPortalTarget={
          typeof document !== "undefined" ? document.body : undefined
        }
        menuPosition="fixed"
        menuPlacement="auto"
        maxMenuHeight={240}
        onChange={(option) => onChange(option?.value || "")}
        placeholder={`Search ${field.link}`}
        noOptionsMessage={() => `No ${field.link} found`}
        styles={linkSelectStyles}
      />
      <p className="mt-1 text-[11px] text-slate-400">
        Linked to {field.link}
        {options.length ? ` · ${options.length} available` : ""}
      </p>
    </div>
  );
  /*
        {options.length ? ` · ${options.length} available` : ""}
  */
}

function FieldControl({ field, value, disabled, onChange }) {
  if (field.type === "link")
    return (
      <LinkControl
        field={field}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    );
  if (field.type === "checkbox") {
    return (
      <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 px-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded text-indigo-600"
        />
        <span className="text-sm text-slate-600">{value ? "Yes" : "No"}</span>
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <select
        className={controlClass}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select {field.label}</option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        rows={3}
        className={controlClass}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return (
    <input
      type={field.type === "currency" ? "text" : field.type}
      step={["number", "currency"].includes(field.type) ? "any" : undefined}
      className={controlClass}
      value={field.type === "color" ? value || "#000000" : value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ChildTable({ field, rows, disabled, onChange }) {
  const add = () => onChange([...(rows || []), emptyData(field.columns)]);
  const update = (rowIndex, name, value) =>
    onChange(
      (rows || []).map((row, index) => {
        if (index !== rowIndex) return row;
        const next = { ...row, [name]: value };
        if (Object.prototype.hasOwnProperty.call(next, "amount"))
          next.amount =
            Number(
              next.qty ?? next.quantity ?? next.hours ?? next.qty_or_hours ?? 0
            ) * Number(next.rate ?? next.hourly_rate ?? next.costPerUnit ?? 0);
        return next;
      })
    );
  const remove = (rowIndex) =>
    onChange(rows.filter((_, index) => index !== rowIndex));
  const duplicate = (rowIndex) =>
    onChange([
      ...rows.slice(0, rowIndex + 1),
      { ...rows[rowIndex] },
      ...rows.slice(rowIndex + 1),
    ]);
  return (
    <section className="col-span-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">
            {field.label}
            {field.required && <span className="ml-1 text-rose-500">*</span>}
          </h3>
          <p className="text-xs text-slate-500">
            {field.required
              ? "Add one or more component rows"
              : "Optional: add rows as needed"}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
          >
            <Plus size={14} /> Add Row
          </button>
        )}
      </div>
      {!rows?.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
          No rows added.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {field.columns.map((column) => (
                  <label key={column.name} className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      {column.label}
                      {column.required && " *"}
                    </span>
                    <FieldControl
                      field={column}
                      value={row[column.name]}
                      disabled={disabled}
                      onChange={(value) => update(rowIndex, column.name, value)}
                    />
                  </label>
                ))}
              </div>
              {!disabled && (
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => duplicate(rowIndex)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Duplicate row"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(rowIndex)}
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    title="Delete row"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DocTypeForm({ slug, id, viewOnly = false }) {
  const router = useRouter();
  const config = textileDoctypes[slug];
  const [data, setData] = useState(() => emptyData(config?.fields || []));
  const [record, setRecord] = useState(null);
  const [status, setStatus] = useState(config?.statuses?.[0] || "Draft");
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const editing = Boolean(id) && !viewOnly;
  const headers = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${
          typeof window !== "undefined" ? localStorage.getItem("token") : ""
        }`,
      },
    }),
    []
  );
  const calculatedData = useMemo(() => {
    const next = { ...data };
    if (slug === "production-cost-sheet") {
      const total = (name, key = "amount") =>
        (data[name] || []).reduce((sum, row) => sum + Number(row[key] || 0), 0);
      next.net_production_cost =
        total("materials") +
        total("labour") +
        total("machines") +
        total("job_work") +
        total("utilities") +
        total("overheads") -
        total("by_products", "recovery_value");
    }
    if (slug === "fabric-inspection") {
      next.total_points = (data.defects || []).reduce(
        (sum, row) => sum + Number(row.points || 0),
        0
      );
      next.inspection_score =
        Number(data.area_or_length) > 0
          ? next.total_points / Number(data.area_or_length)
          : 0;
    }
    if (slug === "job-work-order") {
      next.issued_total = (data.materials || []).reduce(
        (sum, row) => sum + Number(row.qty || 0),
        0
      );
      next.received_total = (data.returns || []).reduce(
        (sum, row) => sum + Number(row.received_qty || 0),
        0
      );
      next.variance = next.issued_total - next.received_total;
    }
    return next;
  }, [data, slug]);

  useEffect(() => {
    if (!id || !config) return;
    api
      .get(`/textiles/doctypes/${slug}/${id}`, headers)
      .then((response) => {
        setRecord(response.data.data);
        setData({ ...emptyData(config.fields), ...response.data.data.data });
        setStatus(response.data.data.status);
      })
      .catch((error) =>
        toast.error(error.response?.data?.message || "Unable to load record")
      )
      .finally(() => setLoading(false));
  }, [config, headers, id, slug]);

  if (!config) return <div className="p-8">Unknown textile DocType.</div>;
  if (loading)
    return (
      <div className="p-8">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = editing
        ? await api.put(
            `/textiles/doctypes/${slug}/${id}`,
            { data: calculatedData, status },
            headers
          )
        : await api.post(
            `/textiles/doctypes/${slug}`,
            { data: calculatedData, status },
            headers
          );
      toast.success(`${config.label} saved`);
      router.push(`/admin/textiles/doctype/${slug}/${response.data.data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save record");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (label) => {
    try {
      const response = await api.post(
        `/textiles/doctypes/${slug}/${id}/action`,
        { action: label },
        headers
      );
      toast.success(`${label} completed`);
      if (response.data.created)
        router.push(
          `/admin/textiles/doctype/${response.data.created.doctype}/${response.data.created._id}/edit`
        );
      else {
        setStatus(response.data.data.status);
        setRecord(response.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/admin/textiles/doctype/${slug}`}
              className="text-sm font-semibold text-indigo-600"
            >
              ← {config.label}
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {viewOnly
                ? record?.documentNumber
                : editing
                ? `Edit ${record?.documentNumber}`
                : `New ${config.label}`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {config.category} · Complete all applicable fields.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewOnly &&
              config.actions?.map((action) => (
                <button
                  key={action.label}
                  onClick={() => runAction(action.label)}
                  className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  {action.label}
                </button>
              ))}
            {viewOnly && (
              <Link
                href={`/admin/textiles/doctype/${slug}/${id}/edit`}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
              >
                Edit
              </Link>
            )}
          </div>
        </div>
        <form
          onSubmit={save}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 p-5 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Document Number
              </span>
              <input
                className={controlClass}
                value={record?.documentNumber || "Auto-generated on save"}
                disabled
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select
                value={status}
                disabled={viewOnly}
                onChange={(event) => setStatus(event.target.value)}
                className={controlClass}
              >
                {getStatusOptions(config).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            {config.fields.map((field) =>
              field.type === "table" ? (
                <ChildTable
                  key={field.name}
                  field={field}
                  rows={data[field.name]}
                  disabled={viewOnly}
                  onChange={(value) =>
                    setData((current) => ({ ...current, [field.name]: value }))
                  }
                />
              ) : (
                <label key={field.name} className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    {field.label}
                    {field.required && (
                      <span className="text-rose-500"> *</span>
                    )}
                  </span>
                  <FieldControl
                    field={field}
                    value={calculatedData[field.name]}
                    disabled={viewOnly || field.readOnly}
                    onChange={(value) =>
                      setData((current) => ({
                        ...current,
                        [field.name]: value,
                      }))
                    }
                  />
                </label>
              )
            )}
          </div>
          {!viewOnly && (
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5">
              <Link
                href={`/admin/textiles/doctype/${slug}`}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600"
              >
                Cancel
              </Link>
              <button
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <Save size={16} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
