"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiChevronRight, FiClock, FiLogOut, FiMapPin, FiNavigation, FiPackage, FiPhone, FiRefreshCw, FiTruck, FiUser } from "react-icons/fi";

const TOKEN_KEY = "pankajal_delivery_token";
const PARTNER_KEY = "pankajal_delivery_partner";
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function DeliveryPartnerPage() {
  const [token, setToken] = useState("");
  const [partner, setPartner] = useState(null);
  const [login, setLogin] = useState({ companySlug: "", phone: "", pin: "" });
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("active");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [delivery, setDelivery] = useState(null);
  const [proof, setProof] = useState({ otp: "", codCollected: false, proofNote: "" });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLogin((value) => ({ ...value, companySlug: params.get("company") || localStorage.getItem("pankajal_delivery_store") || "" }));
    setToken(localStorage.getItem(TOKEN_KEY) || "");
    try { setPartner(JSON.parse(localStorage.getItem(PARTNER_KEY))); } catch {}
  }, []);

  useEffect(() => {
    if (!token) return;
    setBusy("loading");
    fetch("/api/delivery-partner/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not load deliveries"); setOrders(data.orders || []); })
      .catch((err) => { setError(err.message); if (/unauthorized/i.test(err.message)) logout(); })
      .finally(() => setBusy(""));
  }, [token, refresh]);

  const signIn = async (event) => {
    event.preventDefault(); setBusy("login"); setError("");
    try {
      const response = await fetch("/api/delivery-partner/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(login) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Sign in failed");
      localStorage.setItem(TOKEN_KEY, data.token); localStorage.setItem(PARTNER_KEY, JSON.stringify(data.partner)); localStorage.setItem("pankajal_delivery_store", login.companySlug);
      setPartner(data.partner); setToken(data.token);
    } catch (err) { setError(err.message); } finally { setBusy(""); }
  };
  const logout = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(PARTNER_KEY); setToken(""); setPartner(null); setOrders([]); };

  const update = async (order, action, payload = {}) => {
    setBusy(order._id + action); setError("");
    try {
      const response = await fetch(`/api/delivery-partner/orders/${order._id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...payload }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not update delivery");
      setNotice(action === "deliver" ? "Delivery completed. Great work!" : "Delivery status updated"); setDelivery(null); setProof({ otp: "", codCollected: false, proofNote: "" }); setRefresh((value) => value + 1);
    } catch (err) { setError(err.message); } finally { setBusy(""); }
  };

  const shown = useMemo(() => orders.filter((order) => tab === "completed" ? order.assignment?.status === "delivered" : order.assignment?.status !== "delivered"), [orders, tab]);
  const addressText = (order) => [order.address?.address1, order.address?.address2, order.address?.city, order.address?.state, order.address?.zip].filter(Boolean).join(", ");

  if (!token) return <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-900"><div className="mx-auto max-w-md"><div className="mb-8 text-white"><div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400 text-2xl text-slate-950"><FiNavigation /></div><p className="text-xs font-bold uppercase tracking-[.25em] text-emerald-400">Delivery workspace</p><h1 className="mt-2 text-4xl font-black">Ready for your route?</h1><p className="mt-2 text-sm text-slate-400">Sign in to accept, deliver and close assigned orders.</p></div><form onSubmit={signIn} className="space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><label className="block text-xs font-bold text-slate-600">Store code<input className="mt-1 w-full rounded-xl border p-3 text-base font-normal" value={login.companySlug} onChange={(e) => setLogin({ ...login, companySlug: e.target.value })} placeholder="your-store" required /></label><label className="block text-xs font-bold text-slate-600">Mobile number<input inputMode="numeric" maxLength={10} className="mt-1 w-full rounded-xl border p-3 text-base font-normal" value={login.phone} onChange={(e) => setLogin({ ...login, phone: e.target.value.replace(/\D/g, "") })} required /></label><label className="block text-xs font-bold text-slate-600">4-digit PIN<input type="password" inputMode="numeric" maxLength={4} className="mt-1 w-full rounded-xl border p-3 text-base tracking-[.5em]" value={login.pin} onChange={(e) => setLogin({ ...login, pin: e.target.value.replace(/\D/g, "") })} required /></label>{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button disabled={busy === "login"} className="w-full rounded-xl bg-emerald-500 py-3.5 font-black text-slate-950 disabled:opacity-50">{busy === "login" ? "Signing in…" : "Start deliveries"}</button></form></div></main>;

  return <main className="min-h-screen bg-slate-100 pb-24 text-slate-900"><header className="sticky top-0 z-10 bg-slate-950 px-5 pb-5 pt-4 text-white shadow-lg"><div className="mx-auto flex max-w-3xl items-center justify-between"><div><p className="text-xs text-slate-400">{partner?.companyName}</p><h1 className="text-xl font-black">Hello, {partner?.name?.split(" ")[0]}</h1><p className="mt-1 text-xs text-emerald-400">● On duty {partner?.vehicleNumber && `· ${partner.vehicleNumber}`}</p></div><div className="flex gap-2"><button onClick={() => setRefresh((v) => v + 1)} className="rounded-xl bg-white/10 p-3" aria-label="Refresh"><FiRefreshCw /></button><button onClick={logout} className="rounded-xl bg-white/10 p-3" aria-label="Log out"><FiLogOut /></button></div></div></header><div className="mx-auto max-w-3xl p-4"><section className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-500 p-4 text-slate-950"><strong className="block text-3xl">{orders.filter((o) => o.assignment?.status !== "delivered").length}</strong><span className="text-xs font-bold">Stops remaining</span></div><div className="rounded-2xl bg-white p-4 shadow-sm"><strong className="block text-3xl">{orders.filter((o) => o.assignment?.status === "delivered").length}</strong><span className="text-xs text-slate-500">Completed</span></div></section><div className="mb-4 grid grid-cols-2 rounded-xl bg-white p-1 shadow-sm">{[["active", "Active route"], ["completed", "Completed"]].map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded-lg py-2.5 text-sm font-bold ${tab === value ? "bg-slate-900 text-white" : "text-slate-500"}`}>{label}</button>)}</div>{notice && <p className="mb-3 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">{notice}</p>}{error && <p className="mb-3 rounded-xl bg-rose-100 p-3 text-sm text-rose-700">{error}</p>}{busy === "loading" ? <div className="py-20 text-center text-slate-500">Loading your route…</div> : shown.length === 0 ? <div className="rounded-3xl bg-white py-16 text-center text-slate-400"><FiCheck className="mx-auto mb-3 text-5xl text-emerald-500" /><h2 className="font-black text-slate-800">All clear</h2><p className="text-sm">No deliveries in this list.</p></div> : <div className="space-y-4">{shown.map((order, index) => <article key={order._id} className="overflow-hidden rounded-3xl bg-white shadow-sm"><div className="flex items-center justify-between border-b p-4"><span className="flex items-center gap-3"><i className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-black not-italic text-white">{index + 1}</i><span><small className="block text-[10px] font-bold uppercase text-slate-400">Order</small><b className="text-sm">#{order.orderNumber}</b></span></span><span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase text-amber-800">{String(order.assignment?.status || "assigned").replaceAll("_", " ")}</span></div><div className="p-4"><div className="mb-4 flex gap-3"><FiMapPin className="mt-1 shrink-0 text-xl text-emerald-600" /><span><b>{order.customerName}</b><p className="mt-1 text-sm leading-5 text-slate-500">{addressText(order)}</p></span></div><div className="mb-4 flex flex-wrap gap-2"><a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><FiPhone /> Call customer</a><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText(order))}`} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><FiNavigation /> Navigate</a></div><div className="rounded-2xl bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>{order.itemCount} items · {order.paymentMethod?.toUpperCase()}</span><b>{money(order.totalAmount)}</b></div>{order.paymentMethod === "cod" && order.paymentStatus !== "paid" && <p className="mt-2 font-bold text-amber-700">Collect {money(order.totalAmount)} cash</p>}</div><div className="mt-4">{order.assignment?.status === "assigned" && <button onClick={() => update(order, "accept")} disabled={!!busy} className="w-full rounded-xl bg-slate-900 py-3 font-black text-white">Accept delivery <FiChevronRight className="inline" /></button>}{order.assignment?.status === "accepted" && <button onClick={() => update(order, "pickup")} disabled={!!busy} className="w-full rounded-xl bg-emerald-500 py-3 font-black">Confirm pickup</button>}{order.assignment?.status === "picked_up" && <div className="grid grid-cols-2 gap-2"><button onClick={() => update(order, "arrive")} disabled={!!busy} className="rounded-xl border-2 border-slate-900 py-3 font-black">I've arrived</button><button onClick={() => setDelivery(order)} className="rounded-xl bg-emerald-500 py-3 font-black">Deliver now</button></div>}{order.assignment?.status === "arrived" && <button onClick={() => setDelivery(order)} className="w-full rounded-xl bg-emerald-500 py-3 font-black">Verify OTP & deliver</button>}{order.assignment?.status === "failed" && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Attempt failed: {order.assignment.failureReason}. Contact dispatch for reassignment.</p>}{order.assignment?.status === "delivered" && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-700"><FiCheck /> Delivered successfully</p>}</div></div></article>)}</div>}</div>{delivery && <div className="fixed inset-0 z-30 grid items-end bg-slate-950/70 p-3 sm:items-center"><div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><FiPackage /></div><h2 className="text-2xl font-black">Complete delivery</h2><p className="mt-1 text-sm text-slate-500">Ask {delivery.customerName} for the 4-digit delivery OTP.</p><input autoFocus inputMode="numeric" maxLength={4} value={proof.otp} onChange={(e) => setProof({ ...proof, otp: e.target.value.replace(/\D/g, "") })} className="mt-5 w-full rounded-xl border p-4 text-center text-2xl font-black tracking-[.6em]" placeholder="0000" />{delivery.paymentMethod === "cod" && <label className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={proof.codCollected} onChange={(e) => setProof({ ...proof, codCollected: e.target.checked })} /> Cash of {money(delivery.totalAmount)} collected</label>}<input className="mt-3 w-full rounded-xl border p-3 text-sm" placeholder="Proof note (optional)" value={proof.proofNote} onChange={(e) => setProof({ ...proof, proofNote: e.target.value })} /><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setDelivery(null)} className="rounded-xl border py-3 font-bold">Back</button><button disabled={proof.otp.length !== 4 || (delivery.paymentMethod === "cod" && !proof.codCollected) || !!busy} onClick={() => update(delivery, "deliver", proof)} className="rounded-xl bg-emerald-500 py-3 font-black disabled:opacity-40">Confirm delivery</button></div></div></div>}</main>;
}
