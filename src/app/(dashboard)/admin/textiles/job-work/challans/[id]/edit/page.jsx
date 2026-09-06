"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaSave, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "@/lib/api";

export default function EditJobWorkChallan() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [challanRes, warehouseRes] = await Promise.all([
          api.get(`/textiles/job-work-challans/${id}`, config), api.get("/warehouse", config),
        ]);
        const challan = challanRes.data.data;
        if (challan.status !== "draft") {
          toast.info("Only draft challans can be edited");
          router.replace(`/admin/textiles/job-work/challans/${id}`);
          return;
        }
        setWarehouses(warehouseRes.data?.data || []);
        setForm({
          fromWarehouse: challan.fromWarehouse?._id || "", toWarehouse: challan.toWarehouse?._id || "",
          vendorChallanNo: challan.vendorChallanNo || "", issuedDate: challan.issuedDate?.slice(0, 10) || "",
          expectedReturnDate: challan.expectedReturnDate?.slice(0, 10) || "", transport: challan.transport || "",
          vehicleNo: challan.vehicleNo || "", driverName: challan.driverName || "", notes: challan.notes || "",
          items: (challan.items || []).map((item) => ({
            taka: item.taka?._id || item.taka, takaNumber: item.taka?.takaNumber || "Taka",
            quantity: item.quantity || 0, actualMeters: item.actualMeters || 0,
            jobWorkMeters: item.jobWorkMeters || 0, weight: item.weight || 0, notes: item.notes || "",
          })),
        });
      } catch (error) {
        const message = error.response?.data?.message || "Failed to load challan";
        setLoadError(message);
        toast.error(message);
      }
    };
    load();
  }, [id, router]);

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const changeItem = (index, field, value) => setForm((current) => ({
    ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
  const submit = async (event) => {
    event.preventDefault();
    if (form.items.some((item) => Number(item.quantity) <= 0)) return toast.warn("Every quantity must be greater than zero");
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(`/textiles/job-work-challans/${id}`, form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Challan updated");
      router.push(`/admin/textiles/job-work/challans/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update challan");
    } finally { setSaving(false); }
  };

  if (loadError) return <div className="p-10 text-center text-red-600">{loadError}</div>;
  if (!form) return <div className="p-10 text-center text-gray-500">Loading challan...</div>;
  const fieldClass = "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  return (
    <div className="min-h-screen bg-[#f2f5f9] p-4 md:p-6"><form onSubmit={submit} className="mx-auto max-w-4xl space-y-6 rounded-2xl border bg-white p-5 shadow-sm md:p-7">
      <div><h1 className="text-2xl font-extrabold">Edit Job Work Challan</h1><p className="text-sm text-gray-500">Update dispatch details before the challan is issued.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">From warehouse<select name="fromWarehouse" value={form.fromWarehouse} onChange={change} className={fieldClass}><option value="">Select warehouse</option>{warehouses.map((w) => <option key={w._id} value={w._id}>{w.warehouseName}</option>)}</select></label>
        <label className="text-sm font-medium">To warehouse<select name="toWarehouse" value={form.toWarehouse} onChange={change} className={fieldClass}><option value="">Select warehouse</option>{warehouses.map((w) => <option key={w._id} value={w._id}>{w.warehouseName}</option>)}</select></label>
        <label className="text-sm font-medium">Vendor challan no.<input name="vendorChallanNo" value={form.vendorChallanNo} onChange={change} className={fieldClass} /></label>
        <label className="text-sm font-medium">Expected return date<input type="date" name="expectedReturnDate" value={form.expectedReturnDate} onChange={change} className={fieldClass} /></label>
        <label className="text-sm font-medium">Transport<input name="transport" value={form.transport} onChange={change} className={fieldClass} /></label>
        <label className="text-sm font-medium">Vehicle no.<input name="vehicleNo" value={form.vehicleNo} onChange={change} className={fieldClass} /></label>
        <label className="text-sm font-medium">Driver name<input name="driverName" value={form.driverName} onChange={change} className={fieldClass} /></label>
      </div>
      <div><h2 className="mb-2 font-bold">Takas</h2><div className="space-y-2">{form.items.map((item, index) => <div key={item.taka} className="grid items-end gap-3 rounded-xl border bg-gray-50 p-3 sm:grid-cols-4"><div className="pb-2 font-mono text-sm font-bold text-indigo-600">{item.takaNumber}</div><label className="text-xs">Quantity<input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => changeItem(index, "quantity", Number(e.target.value))} className={fieldClass} /></label><label className="text-xs">Actual meters<input type="number" min="0" step="0.01" value={item.actualMeters} onChange={(e) => changeItem(index, "actualMeters", Number(e.target.value))} className={fieldClass} /></label><label className="text-xs">Weight<input type="number" min="0" step="0.01" value={item.weight} onChange={(e) => changeItem(index, "weight", Number(e.target.value))} className={fieldClass} /></label></div>)}</div></div>
      <label className="block text-sm font-medium">Notes<textarea name="notes" rows={3} value={form.notes} onChange={change} className={fieldClass} /></label>
      <div className="flex gap-3 border-t pt-5"><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-50"><FaSave />{saving ? "Saving..." : "Save Changes"}</button><button type="button" onClick={() => router.back()} className="flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-bold"><FaTimes />Cancel</button></div>
    </form></div>
  );
}
