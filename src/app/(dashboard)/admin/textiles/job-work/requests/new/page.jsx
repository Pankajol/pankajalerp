"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "@/lib/api";

const initialForm = {
  vendor: "", customer: "", process: "", takas: [], design: "",
  customerCode: "", customerName: "",
  deliveryDesign: "", deliveryDate: "", notes: "", status: "draft",
  sourceWarehouse: "", targetWarehouse: "", issueDate: new Date().toISOString().split("T")[0], expectedReturnDate: "",
};

export default function NewJobWorkRequest() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [takas, setTakas] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [vendorRes, customerRes, takaRes, designRes, warehouseRes] = await Promise.all([
          api.get("/suppliers?limit=100", config),
          api.get("/customers?limit=100", config),
          api.get("/textiles/takas?status=available", config),
          api.get("/textiles/designs?status=active", config),
          api.get("/warehouse?limit=100", config),
        ]);
        setVendors(vendorRes.data?.data || []);
        setCustomers(customerRes.data?.data || []);
        setTakas(takaRes.data?.data || []);
        setDesigns(designRes.data?.data || []);
        setWarehouses(warehouseRes.data?.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load form data");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  const vendorOptions = useMemo(() => vendors.map((vendor) => ({
    value: vendor._id,
    label: `${vendor.supplierName || "Unnamed vendor"}${vendor.supplierCode ? ` (${vendor.supplierCode})` : ""}`,
  })), [vendors]);
  const customerOptions = useMemo(() => customers.map((customer) => ({
    value: customer._id,
    label: customer.customerName || "Unnamed customer",
    code: customer.customerCode || "",
  })), [customers]);
  const takaOptions = useMemo(() => takas.map((taka) => ({
    value: taka._id,
    label: `${taka.takaNumber} - ${taka.fabric?.itemName || "Fabric"} (${Number(taka.quantity || 0).toFixed(2)} m)`,
  })), [takas]);
  const designOptions = useMemo(() => designs.map((design) => ({
    value: design._id,
    label: `${design.designCode} - ${design.description}`,
  })), [designs]);
  const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({ value: warehouse._id, label: warehouse.warehouseName || warehouse.name || warehouse.warehouseCode })), [warehouses]);

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.vendor || !form.design || !form.process.trim() || !form.takas.length) {
      toast.warn("Select a vendor, design, process and at least one taka");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const materials = form.takas.map((takaId) => { const taka = takas.find((item) => item._id === takaId); return { item: taka?.fabric?._id || taka?.fabric || null, batch: taka?.lot?.lotNumber || taka?.lot?._id || taka?.lot || "", qty: Number(taka?.quantity || 0), uom: "Mtr", rate: 0, amount: 0 }; });
      const response = await api.post("/textiles/job-work-requests", { ...form, materials }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Job work request created");
      router.push(`/admin/textiles/job-work/requests/${response.data.data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create request");
    } finally {
      setSaving(false);
    }
  };

  if (fetching) return <div className="p-10 text-center text-gray-500">Loading form...</div>;

  const inputClass = "w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  return (
    <div className="min-h-screen bg-[#f2f5f9] p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-xl bg-white p-3 shadow-sm" aria-label="Go back"><FaArrowLeft /></button>
          <div><h1 className="text-2xl font-extrabold text-gray-900">New Job Work Request</h1><p className="text-sm text-gray-500">Choose the vendor, process and fabric rolls.</p></div>
        </div>
        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Vendor *
              <Select className="mt-1" options={vendorOptions} isClearable isSearchable onChange={(option) => setForm((current) => ({ ...current, vendor: option?.value || "" }))} placeholder="Search vendor..." />
            </label>
            <label className="text-sm font-medium text-gray-700">Process *
              <input name="process" value={form.process} onChange={change} className={`${inputClass} mt-1`} placeholder="Dyeing, printing, finishing..." required />
            </label>
            <label className="text-sm font-medium text-gray-700">Customer
              <Select className="mt-1" options={customerOptions} isClearable isSearchable onChange={(option) => setForm((current) => ({ ...current, customer: option?.value || "", customerName: option?.label || "", customerCode: option?.code || "" }))} placeholder="Search customer..." />
            </label>
            <label className="text-sm font-medium text-gray-700">Delivery date
              <input type="date" name="deliveryDate" value={form.deliveryDate} onChange={change} className={`${inputClass} mt-1`} />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">Takas *
            <Select className="mt-1" options={takaOptions} isMulti isSearchable closeMenuOnSelect={false} onChange={(options) => setForm((current) => ({ ...current, takas: options.map((option) => option.value) }))} placeholder="Search and select available takas..." />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Source Warehouse<Select className="mt-1" options={warehouseOptions} isClearable isSearchable onChange={(option) => setForm((current) => ({ ...current, sourceWarehouse: option?.value || "" }))} /></label>
            <label className="text-sm font-medium text-gray-700">Target / Vendor Warehouse<Select className="mt-1" options={warehouseOptions} isClearable isSearchable onChange={(option) => setForm((current) => ({ ...current, targetWarehouse: option?.value || "" }))} /></label>
            <label className="text-sm font-medium text-gray-700">Issue Date<input type="date" name="issueDate" value={form.issueDate} onChange={change} className={`${inputClass} mt-1`} /></label>
            <label className="text-sm font-medium text-gray-700">Expected Return Date<input type="date" name="expectedReturnDate" value={form.expectedReturnDate} onChange={change} className={`${inputClass} mt-1`} /></label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Design *
              <Select className="mt-1" options={designOptions} isClearable isSearchable required onChange={(option) => setForm((current) => ({ ...current, design: option?.value || "" }))} placeholder="Search design code or description..." />
            </label>
            <label className="text-sm font-medium text-gray-700">Delivery design<input name="deliveryDesign" value={form.deliveryDesign} onChange={change} className={`${inputClass} mt-1`} /></label>
          </div>
          <label className="block text-sm font-medium text-gray-700">Notes<textarea name="notes" value={form.notes} onChange={change} rows={3} className={`${inputClass} mt-1`} /></label>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
            <label className="text-sm font-medium text-gray-700">Save as
              <select name="status" value={form.status} onChange={change} className="ml-2 rounded-lg border border-gray-200 px-3 py-2"><option value="draft">Draft</option><option value="submitted">Submit for approval</option></select>
            </label>
            <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"><FaSave /> {saving ? "Saving..." : "Create Request"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
