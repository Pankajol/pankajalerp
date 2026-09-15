"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBox, FiCalendar, FiCheck, FiCheckCircle, FiChevronRight, FiClock,
  FiCopy, FiMapPin, FiPackage, FiPlus, FiRefreshCw, FiSearch, FiTruck,
  FiUser, FiUsers, FiX,
} from "react-icons/fi";
import ProtectedPage from "@/components/ProtectedPage";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value || 0));
const statuses = ["Open", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const steps = ["Open", "Processing", "Packed", "Out for Delivery", "Delivered"];
const tones = {
  Open: "bg-sky-100 text-sky-700", Processing: "bg-amber-100 text-amber-700",
  Packed: "bg-violet-100 text-violet-700", Shipped: "bg-indigo-100 text-indigo-700",
  "Out for Delivery": "bg-orange-100 text-orange-700", Delivered: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
};
const when = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—";
const address = (order) => [order.shippingAddress?.address1, order.shippingAddress?.address2, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.zip].filter(Boolean).join(", ");

function Status({ value }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tones[value] || "bg-slate-100 text-slate-600"}`}>{value}</span>;
}

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState({ total: 0, today: 0, active: 0, revenue: 0 });
  const [filters, setFilters] = useState({ period: "today", status: "all", search: "" });
  const [selected, setSelected] = useState(null);
  const [partnerId, setPartnerId] = useState("");
  const [details, setDetails] = useState({ estimatedDelivery: "", paymentStatus: "pending", note: "" });
  const [newPartner, setNewPartner] = useState({ name: "", phone: "", vehicleNumber: "", pin: "" });
  const [partnerModal, setPartnerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams(filters);
        const response = await fetch(`/api/shop-orders?${query}`, { signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load shop orders");
        setOrders(data.orders || []); setPartners(data.partners || []); setStore(data.store || null); setStats(data.stats || {});
        setSelected((current) => current ? (data.orders || []).find((item) => item._id === current._id) || current : null);
      } catch (error) { if (error.name !== "AbortError") setNotice({ error: true, text: error.message }); }
      finally { setLoading(false); }
    }, filters.search ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, refresh]);

  useEffect(() => { const id = setInterval(() => setRefresh((v) => v + 1), 20000); return () => clearInterval(id); }, []);

  const selectOrder = (order) => {
    setSelected(order); setPartnerId(String(order.deliveryAssignment?.partnerId || "")); setNotice(null);
    setDetails({ estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().slice(0, 10) : "", paymentStatus: order.paymentStatus || "pending", note: "" });
  };

  const updateOrder = async (payload, message) => {
    if (!selected) return;
    setSaving(payload.deliveryPartnerId ? "assign" : payload.status || "details"); setNotice(null);
    try {
      const response = await fetch("/api/shop-orders", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ orderId: selected._id, ...payload }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Update failed");
      setSelected(data.order); setNotice({ error: false, text: message }); setRefresh((v) => v + 1);
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setSaving(""); }
  };

  const createPartner = async (event) => {
    event.preventDefault(); setSaving("partner"); setNotice(null);
    try {
      const response = await fetch("/api/delivery-partners", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(newPartner) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not create rider");
      setPartners((current) => [...current.filter((p) => p._id !== data.partner._id), data.partner]); setPartnerId(data.partner._id);
      setNewPartner({ name: "", phone: "", vehicleNumber: "", pin: "" }); setPartnerModal(false); setNotice({ error: false, text: `${data.partner.name} created. Click Assign now.` });
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setSaving(""); }
  };

  const assign = () => {
    if (!partnerId) return setNotice({ error: true, text: "Select a delivery partner first." });
    const pack = ["Open", "Processing"].includes(selected.status);
    updateOrder({ status: pack ? "Packed" : selected.status, deliveryPartnerId: partnerId, estimatedDelivery: details.estimatedDelivery || undefined, note: pack ? "Packed and assigned to delivery partner" : "Assigned to delivery partner" }, pack ? "Order packed and rider assigned." : "Rider assigned successfully.");
  };

  const copyLogin = async () => {
    if (!store?.slug) return setNotice({ error: true, text: "Store code is not configured." });
    await navigator.clipboard.writeText(`${window.location.origin}/delivery-partner?company=${store.slug}`);
    setNotice({ error: false, text: "Delivery partner login link copied." });
  };

  const grouped = useMemo(() => orders.reduce((all, order) => {
    const day = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    (all[day] ||= []).push(order); return all;
  }, {}), [orders]);
  const selectedStep = selected ? steps.indexOf(selected.status === "Shipped" ? "Packed" : selected.status) : -1;
  const closed = ["Delivered", "Cancelled"].includes(selected?.status);

  return <ProtectedPage module="Sales Order" action="view"><main className="min-h-screen bg-[#f5f7fb] p-3 text-slate-900 md:p-7"><div className="mx-auto max-w-[1450px]">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.22em] text-indigo-600">Storefront operations</p><h1 className="mt-1 text-3xl font-black">Orders & Delivery</h1><p className="mt-1 text-sm text-slate-500">Prepare orders, assign riders and track every delivery.</p></div><div className="flex flex-wrap gap-2"><button onClick={copyLogin} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"><FiCopy /> Copy rider login</button><button onClick={() => setPartnerModal(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"><FiPlus /> Add rider</button><button onClick={() => setRefresh((v) => v + 1)} className="rounded-xl border bg-white p-3"><FiRefreshCw /></button></div></header>
    {notice && <div className={`mb-4 flex justify-between rounded-xl border px-4 py-3 text-sm ${notice.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span>{notice.text}</span><button onClick={() => setNotice(null)}><FiX /></button></div>}
    <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Today", stats.today, FiCalendar], ["Active", stats.active, FiPackage], ["All orders", stats.total, FiBox], ["Revenue", money(stats.revenue), FiCheckCircle]].map(([label, value, Icon]) => <div key={label} className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon /></span><span><strong className="block text-xl font-black">{value}</strong><small className="text-slate-500">{label}</small></span></div>)}</section>
    <section className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="flex flex-wrap gap-3 border-b p-4"><label className="relative min-w-56 flex-1"><FiSearch className="absolute left-3 top-3.5 text-slate-400" /><input className="w-full rounded-xl border bg-slate-50 py-3 pl-10 pr-3 text-sm" placeholder="Order number or customer" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label><select className="rounded-xl border px-3 text-sm" value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })}><option value="today">Today</option><option value="all">All dates</option></select><select className="rounded-xl border px-3 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="all">All statuses</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="grid min-h-[650px] lg:grid-cols-[minmax(340px,.8fr)_minmax(520px,1.2fr)]"><div className="max-h-[780px] overflow-y-auto border-r p-3 md:p-4">{loading ? <div className="grid h-60 place-items-center text-sm text-slate-500">Loading orders…</div> : !orders.length ? <div className="grid h-60 place-items-center text-center text-slate-400"><div><FiBox className="mx-auto mb-3 text-4xl" /><b>No shop orders found</b></div></div> : Object.entries(grouped).map(([day, rows]) => <div className="mb-5" key={day}><h2 className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{day} · {rows.length}</h2><div className="space-y-2">{rows.map((order) => <button key={order._id} onClick={() => selectOrder(order)} className={`w-full rounded-2xl border p-4 text-left ${selected?._id === order._id ? "border-indigo-500 bg-indigo-50" : "hover:border-slate-300"}`}><div className="flex justify-between gap-2"><span><b className="block text-sm">#{order.documentNumberOrder}</b><small className="text-slate-500">{order.customerName}</small></span><Status value={order.status} /></div><div className="mt-3 flex justify-between border-t pt-3 text-xs text-slate-500"><span>{order.items?.length || 0} items · {order.deliveryAssignment?.partnerName || "Rider pending"}</span><b className="text-sm text-slate-800">{money(order.grandTotal)}</b></div></button>)}</div></div>)}</div>
        <aside className="bg-slate-50/60 p-4 md:p-6">{!selected ? <div className="grid min-h-[550px] place-items-center text-center text-slate-400"><div><FiPackage className="mx-auto mb-3 text-5xl" /><h2 className="font-black text-slate-700">Select an order</h2><p className="text-sm">Preparation and rider assignment appear here.</p></div></div> : <div className="space-y-5"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Order fulfilment</p><h2 className="mt-1 text-2xl font-black">#{selected.documentNumberOrder}</h2><small className="text-slate-500">Placed {when(selected.createdAt)}</small></div><Status value={selected.status} /></div>
          {selected.status !== "Cancelled" && <div className="rounded-2xl border bg-white p-4"><div className="flex">{steps.map((step, index) => <div className="relative flex flex-1 flex-col items-center" key={step}><span className={`relative z-[1] grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black ${index <= selectedStep ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-400"}`}>{index < selectedStep ? <FiCheck /> : index + 1}</span>{index < steps.length - 1 && <i className={`absolute left-1/2 top-4 h-0.5 w-full ${index < selectedStep ? "bg-indigo-600" : "bg-slate-200"}`} />}<small className="mt-2 hidden text-center text-[9px] font-bold text-slate-500 sm:block">{step}</small></div>)}</div></div>}
          <div className="grid gap-3 xl:grid-cols-2"><section className="rounded-2xl border bg-white p-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-black"><FiUser className="text-indigo-600" /> Customer</h3><b>{selected.customerName}</b><p className="mt-1 text-xs leading-5 text-slate-500"><FiMapPin className="mr-1 inline" />{address(selected) || "Address unavailable"}</p><div className="mt-3 flex justify-between border-t pt-3 text-xs"><span>Payment</span><b>{selected.paymentMethod?.toUpperCase()} · {selected.paymentStatus}</b></div></section><section className="rounded-2xl border bg-white p-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-black"><FiPackage className="text-indigo-600" /> Order items</h3><div className="max-h-28 space-y-2 overflow-y-auto">{selected.items?.map((item, index) => <div key={index} className="flex justify-between text-xs"><span>{item.itemName} × {item.quantity || item.orderedQuantity}</span><b>{money((item.quantity || item.orderedQuantity) * item.unitPrice)}</b></div>)}</div><div className="mt-3 flex justify-between border-t pt-3"><b>Total</b><strong>{money(selected.grandTotal)}</strong></div></section></div>
          {!closed && <section className="rounded-2xl border bg-white p-4"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Step 1 · Prepare</p><div className="mt-1 flex items-start justify-between"><div><h3 className="font-black">Prepare order</h3><p className="text-xs text-slate-500">Update when the store team finishes each stage.</p></div><FiBox className="text-2xl text-indigo-600" /></div>{selected.status === "Open" && <button disabled={!!saving} onClick={() => updateOrder({ status: "Processing", note: "Store started preparing the order" }, "Order moved to processing.")} className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white">Start preparing <FiChevronRight className="inline" /></button>}{selected.status === "Processing" && <button disabled={!!saving} onClick={() => updateOrder({ status: "Packed", note: "Order packed and ready" }, "Order marked packed.")} className="mt-4 w-full rounded-xl bg-violet-600 py-3 text-sm font-black text-white">Mark packed <FiCheck className="inline" /></button>}{["Packed", "Shipped", "Out for Delivery"].includes(selected.status) && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><FiCheckCircle /> Ready for assignment</div>}</section>}
          {!closed && <section className="rounded-2xl border border-emerald-100 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Step 2 · Assign</p><div className="mt-1 flex justify-between"><div><h3 className="font-black">Assign delivery partner</h3><p className="text-xs text-slate-500">The order appears instantly on the rider's phone.</p></div><FiTruck className="text-2xl text-emerald-600" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{partners.map((partner) => <button key={partner._id} onClick={() => setPartnerId(partner._id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${partnerId === partner._id ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : ""}`}><span className={`grid h-9 w-9 place-items-center rounded-full font-black ${partnerId === partner._id ? "bg-emerald-500" : "bg-slate-100"}`}>{partner.name?.[0]}</span><span className="min-w-0"><b className="block truncate text-sm">{partner.name}</b><small className="block truncate text-slate-500">{partner.phone}{partner.vehicleNumber ? ` · ${partner.vehicleNumber}` : ""}</small></span>{partnerId === partner._id && <FiCheck className="ml-auto text-emerald-600" />}</button>)}</div>{!partners.length && <div className="mt-4 rounded-xl border border-dashed p-4 text-center text-sm text-slate-500">No riders created yet.</div>}<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><button onClick={() => setPartnerModal(true)} className="rounded-xl border border-dashed py-3 text-sm font-bold text-indigo-600"><FiPlus className="inline" /> Add rider</button><button disabled={!partnerId || !!saving} onClick={assign} className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black disabled:opacity-40">{saving === "assign" ? "Assigning…" : ["Open", "Processing"].includes(selected.status) ? "Pack & assign" : selected.deliveryAssignment?.partnerId ? "Reassign" : "Assign now"}</button></div>{selected.deliveryAssignment?.partnerName && <div className="mt-3 rounded-xl bg-slate-900 p-3 text-sm text-white"><small className="block text-slate-400">Currently assigned</small><b>{selected.deliveryAssignment.partnerName} · {String(selected.deliveryAssignment.status).replaceAll("_", " ")}</b></div>}</section>}
          <section className="rounded-2xl border bg-white p-4"><h3 className="flex items-center gap-2 text-sm font-black"><FiClock className="text-indigo-600" /> Customer update</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Expected date<input type="date" className="mt-1 w-full rounded-xl border p-2.5 font-normal" value={details.estimatedDelivery} onChange={(e) => setDetails({ ...details, estimatedDelivery: e.target.value })} /></label><label className="text-xs font-bold">Payment status<select className="mt-1 w-full rounded-xl border p-2.5 font-normal" value={details.paymentStatus} onChange={(e) => setDetails({ ...details, paymentStatus: e.target.value })}>{["pending", "paid", "failed", "refund_pending", "refunded"].map((v) => <option key={v}>{v}</option>)}</select></label><label className="text-xs font-bold sm:col-span-2">Timeline message<textarea className="mt-1 min-h-16 w-full rounded-xl border p-2.5 font-normal" value={details.note} onChange={(e) => setDetails({ ...details, note: e.target.value })} placeholder="Packed carefully and ready" /></label></div><button disabled={!!saving} onClick={() => updateOrder(details, "Customer update saved.")} className="mt-3 w-full rounded-xl border border-indigo-200 py-2.5 text-sm font-black text-indigo-700">Save customer update</button></section>
        </div>}</aside></div></section>
  </div>
  {partnerModal && <div className="fixed inset-0 z-50 grid items-end bg-slate-950/60 p-3 sm:items-center"><form onSubmit={createPartner} className="mx-auto w-full max-w-lg rounded-3xl bg-white p-6"><div className="mb-5 flex justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">New delivery partner</p><h2 className="text-2xl font-black">Add a rider</h2></div><button type="button" onClick={() => setPartnerModal(false)} className="rounded-xl bg-slate-100 p-2"><FiX /></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Full name<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={newPartner.name} onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })} required /></label><label className="text-xs font-bold">Phone<input inputMode="numeric" maxLength={10} className="mt-1 w-full rounded-xl border p-3 font-normal" value={newPartner.phone} onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value.replace(/\D/g, "") })} required /></label><label className="text-xs font-bold">Vehicle number<input className="mt-1 w-full rounded-xl border p-3 font-normal uppercase" value={newPartner.vehicleNumber} onChange={(e) => setNewPartner({ ...newPartner, vehicleNumber: e.target.value.toUpperCase() })} /></label><label className="text-xs font-bold">4-digit login PIN<input type="password" inputMode="numeric" maxLength={4} className="mt-1 w-full rounded-xl border p-3 font-normal tracking-[.3em]" value={newPartner.pin} onChange={(e) => setNewPartner({ ...newPartner, pin: e.target.value.replace(/\D/g, "") })} required /></label></div><div className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800"><FiUsers className="mr-1 inline" /> Rider uses the copied login link, phone and PIN.</div><button disabled={saving === "partner" || newPartner.phone.length !== 10 || newPartner.pin.length !== 4} className="mt-4 w-full rounded-xl bg-indigo-600 py-3.5 font-black text-white disabled:opacity-40">{saving === "partner" ? "Creating…" : "Create rider"}</button></form></div>}
  </main></ProtectedPage>;
}
