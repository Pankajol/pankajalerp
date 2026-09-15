"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, Boxes, CheckCircle2, ClipboardList, Factory, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

const COLORS = ["#22c55e", "#f59e0b"];
const number = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0));

function Metric({ label, value, note, icon: Icon, color }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>{note && <p className="mt-1 text-xs text-slate-500">{note}</p>}</div><span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={19} /></span></div></div>;
}

export default function ProcessWIPPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (showToast = false) => {
    setLoading(true); setError("");
    try {
      const response = await api.get("/textiles/process-wip");
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to load process WIP");
      setData(response.data.data);
      if (showToast) toast.success("Process WIP refreshed");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to load process WIP";
      setError(message); if (showToast) toast.error(message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  const processes = data?.processes || [];
  const pieData = [{ name: "Completed", value: summary.totalDone || 0 }, { name: "Pending", value: summary.totalBalance || 0 }];

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-7xl">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Live textile documents</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold text-slate-900"><Activity className="text-indigo-600" size={27} />Process WIP</h1><p className="mt-2 text-sm text-slate-500">Planned and completed quantities from Process, Dyeing, Printing and Finishing Orders.</p></div><div className="flex gap-2"><Link href="/admin/textiles/flow" className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700"><ClipboardList size={16} />Production flow</Link><button type="button" onClick={() => load(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button></div></header>
    {error && <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => load()} className="font-bold underline">Retry</button></div>}
    {loading && !data ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div> : <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Overall progress" value={`${summary.overallProgress || 0}%`} note="Completed output against planned output" icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" /><Metric label="Planned output" value={number(summary.totalPlanned)} note={`${summary.activeProcesses || 0} active processes`} icon={Factory} color="bg-indigo-50 text-indigo-600" /><Metric label="Completed output" value={number(summary.totalDone)} note={`${number(summary.totalBalance)} remaining`} icon={Activity} color="bg-sky-50 text-sky-600" /><Metric label="Production batches" value={number(summary.productionBatches)} note={`${summary.processCount || 0} process types recorded`} icon={Boxes} color="bg-amber-50 text-amber-600" /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-3"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><h2 className="font-bold text-slate-900">Process-wise output</h2><p className="mt-1 text-sm text-slate-500">Quantity recorded in textile process documents.</p>{processes.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={processes} margin={{ top: 25, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="process" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="planned" name="Planned" fill="#a5b4fc" radius={[5, 5, 0, 0]} /><Bar dataKey="done" name="Completed" fill="#4f46e5" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="grid h-[300px] place-items-center text-center"><div><Factory className="mx-auto text-slate-300" size={35} /><p className="mt-2 text-sm text-slate-500">No process orders yet.</p><Link href="/admin/textiles/doctype/process-order/new" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">Create Process Order<ArrowRight size={13} /></Link></div></div>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Overall progress</h2><p className="mt-1 text-sm text-slate-500">Completed versus pending quantity.</p>{summary.totalPlanned ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>{pieData.map((row, index) => <Cell key={row.name} fill={COLORS[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="grid h-[260px] place-items-center text-sm text-slate-400">No quantity data yet.</div>}</section></div>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Active process detail</h2><p className="mt-1 text-sm text-slate-500">Each row is calculated from your current textile process documents.</p></div><Link href="/admin/textiles/doctype/process-order/new" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white"><Activity size={14} />New Process Order</Link></div>{processes.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3">Process</th><th className="pb-3 text-right">Documents</th><th className="pb-3 text-right">Planned</th><th className="pb-3 text-right">Completed</th><th className="pb-3 text-right">Balance</th><th className="pb-3 text-right">Progress</th></tr></thead><tbody>{processes.map((row) => <tr key={row.process} className="border-b border-slate-100 last:border-0"><td className="py-4 font-semibold text-slate-700"><span>{row.process}</span><span className="mt-1 block h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-indigo-500" style={{ width: `${row.progress}%` }} /></span></td><td className="py-4 text-right text-slate-600">{row.documentCount}</td><td className="py-4 text-right text-slate-600">{number(row.planned)}</td><td className="py-4 text-right font-semibold text-emerald-600">{number(row.done)}</td><td className="py-4 text-right font-semibold text-amber-600">{number(row.balance)}</td><td className="py-4 text-right font-bold text-slate-800">{row.progress}%</td></tr>)}</tbody></table></div> : null}</section>
    {data?.recentDocuments?.length ? <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Recent process documents</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{data.recentDocuments.map((record) => <Link key={record._id} href={`/admin/textiles/doctype/${record.doctype}/${record._id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-indigo-200 hover:bg-indigo-50"><span className="min-w-0"><strong className="block truncate text-sm text-slate-700">{record.documentNumber}</strong><small className="text-slate-500">{record.label}</small></span><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">{record.status}</span></Link>)}</div></section> : null}</>}</div></main>;
}
