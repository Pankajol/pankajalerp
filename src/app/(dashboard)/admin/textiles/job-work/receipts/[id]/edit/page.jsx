"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaSave, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "@/lib/api";

export default function EditJobWorkReceipt() {
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
        const [receiptRes, warehouseRes] = await Promise.all([
          api.get(`/textiles/job-work-receipts/${id}`, config), api.get("/warehouse", config),
        ]);
        const receipt = receiptRes.data.data;
        if (receipt.status === "qc") {
          toast.info("QC-completed receipts cannot be edited");
          router.replace(`/admin/textiles/job-work/receipts/${id}`);
          return;
        }
        setWarehouses(warehouseRes.data?.data || []);
        setForm({
          toWarehouse: receipt.toWarehouse?._id || "", receivedDate: receipt.receivedDate?.slice(0, 10) || "",
          vendorChallanNo: receipt.vendorChallanNo || "", vendorLotNo: receipt.vendorLotNo || "",
          processLoss: receipt.processLoss || 0, wastage: receipt.wastage || 0, shortage: receipt.shortage || 0,
          reason: receipt.reason || "", lotComplete: Boolean(receipt.lotComplete),
          items: (receipt.items || []).map((item) => ({
            taka: item.taka?._id || item.taka, takaNumber: item.taka?.takaNumber || "Taka",
            challanQuantity: item.challanQuantity || 0, receivedQuantity: item.receivedQuantity || 0,
            actualMeters: item.actualMeters || 0, lumpNo: item.lumpNo || "", notes: item.notes || "",
          })),
        });
      } catch (error) {
        const message = error.response?.data?.message || "Failed to load receipt";
        setLoadError(message);
        toast.error(message);
      }
    };
    load();
  }, [id, router]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const changeItem = (index, field, value) => setForm((current) => ({
    ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
  const totalSent = form?.items.reduce((sum, item) => sum + Number(item.challanQuantity || 0), 0) || 0;
  const totalReceived = form?.items.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0) || 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.toWarehouse || form.items.some((item) => Number(item.receivedQuantity) <= 0)) return toast.warn("Select a warehouse and enter positive received quantities");
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(`/textiles/job-work-receipts/${id}`, form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Receipt updated");
      router.push(`/admin/textiles/job-work/receipts/${id}`);
    } catch (error) { toast.error(error.response?.data?.message || "Could not update receipt"); }
    finally { setSaving(false); }
  };

  if (loadError) return <div className="p-10 text-center text-red-600">{loadError}</div>;
  if (!form) return <div className="p-10 text-center text-gray-500">Loading receipt...</div>;
  const fieldClass = "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
  const shrinkage = totalSent - totalReceived;
  return (
    <div className="min-h-screen bg-[#f2f5f9] p-4 md:p-6"><form onSubmit={submit} className="mx-auto max-w-4xl space-y-6 rounded-2xl border bg-white p-5 shadow-sm md:p-7">
      <div><h1 className="text-2xl font-extrabold">Edit Job Work Receipt</h1><p className="text-sm text-gray-500">Correct received quantities and return details.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">To warehouse *<select required name="toWarehouse" value={form.toWarehouse} onChange={change} className={fieldClass}><option value="">Select warehouse</option>{warehouses.map((w) => <option key={w._id} value={w._id}>{w.warehouseName}</option>)}</select></label>
        <label className="text-sm font-medium">Received date<input type="date" name="receivedDate" value={form.receivedDate} onChange={change} className={fieldClass} /></label>
        <label className="text-sm font-medium">Vendor challan no.<input name="vendorChallanNo" value={form.vendorChallanNo} onChange={change} className={fieldClass} /></label>
        <label className="text-sm font-medium">Vendor lot no.<input name="vendorLotNo" value={form.vendorLotNo} onChange={change} className={fieldClass} /></label>
      </div>
      <div><h2 className="mb-2 font-bold">Received Takas</h2><div className="space-y-2">{form.items.map((item, index) => <div key={item.taka} className="grid items-end gap-3 rounded-xl border bg-gray-50 p-3 sm:grid-cols-4"><div className="pb-2 font-mono text-sm font-bold text-emerald-600">{item.takaNumber}<div className="font-sans text-xs font-normal text-gray-500">Sent: {item.challanQuantity} m</div></div><label className="text-xs">Received *<input type="number" min="0.01" step="0.01" value={item.receivedQuantity} onChange={(e) => changeItem(index, "receivedQuantity", Number(e.target.value))} className={fieldClass} /></label><label className="text-xs">Actual meters<input type="number" min="0" step="0.01" value={item.actualMeters} onChange={(e) => changeItem(index, "actualMeters", Number(e.target.value))} className={fieldClass} /></label><label className="text-xs">Lump no.<input value={item.lumpNo} onChange={(e) => changeItem(index, "lumpNo", e.target.value)} className={fieldClass} /></label></div>)}</div></div>
      <div className="rounded-xl bg-emerald-50 p-4 text-sm"><span className="mr-6">Sent: <b>{totalSent.toFixed(2)} m</b></span><span className="mr-6">Received: <b>{totalReceived.toFixed(2)} m</b></span><span>Shrinkage: <b>{shrinkage.toFixed(2)} m ({totalSent ? ((shrinkage / totalSent) * 100).toFixed(2) : "0.00"}%)</b></span></div>
      <div className="grid gap-4 md:grid-cols-3"><label className="text-sm">Process loss<input type="number" step="0.01" name="processLoss" value={form.processLoss} onChange={change} className={fieldClass} /></label><label className="text-sm">Wastage<input type="number" step="0.01" name="wastage" value={form.wastage} onChange={change} className={fieldClass} /></label><label className="text-sm">Shortage<input type="number" step="0.01" name="shortage" value={form.shortage} onChange={change} className={fieldClass} /></label></div>
      <label className="block text-sm">Reason / notes<input name="reason" value={form.reason} onChange={change} className={fieldClass} /></label>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="lotComplete" checked={form.lotComplete} onChange={change} /> Lot complete</label>
      <div className="flex gap-3 border-t pt-5"><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white disabled:opacity-50"><FaSave />{saving ? "Saving..." : "Save Changes"}</button><button type="button" onClick={() => router.back()} className="flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-bold"><FaTimes />Cancel</button></div>
    </form></div>
  );
}
