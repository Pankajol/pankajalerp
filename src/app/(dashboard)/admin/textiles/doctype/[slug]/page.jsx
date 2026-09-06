"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, Eye, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { textileDoctypes } from "@/lib/textiles/doctypeConfig";
import { downloadMasterTemplate, parseMasterWorkbook } from "@/lib/textiles/excelMaster";

export default function TextileDocTypeListPage() {
  const { slug } = useParams();
  const config = textileDoctypes[slug];
  const fileInput = useRef(null);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const headers = useMemo(() => ({ headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}` } }), []);

  const load = async () => {
    try {
      const response = await api.get(`/textiles/doctypes/${slug}?search=${encodeURIComponent(search)}`, headers);
      setRecords(response.data.data || []);
    } catch (error) { toast.error(error.response?.data?.message || "Unable to load records"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (config) load(); }, [slug]);

  if (!config) return <div className="p-8">Unknown textile DocType.</div>;
  const isMaster = config.category === "Masters";
  const remove = async (record) => {
    if (!confirm(`Delete ${record.documentNumber}?`)) return;
    try { await api.delete(`/textiles/doctypes/${slug}/${record._id}`, headers); toast.success("Record deleted"); load(); }
    catch (error) { toast.error(error.response?.data?.message || "Unable to delete record"); }
  };
  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseMasterWorkbook(file, config);
      const response = await api.post(`/textiles/doctypes/${slug}/import`, { rows }, headers);
      toast.success(`${response.data.imported} ${config.label} record(s) imported`);
      setLoading(true); await load();
    } catch (error) {
      const details = error.response?.data?.errors?.slice(0, 3).map((item) => `Row ${item.row}: ${item.message}`).join("; ");
      toast.error(details || error.response?.data?.message || error.message || "Excel import failed", { autoClose: 8000 });
    } finally { setImporting(false); }
  };
  const summary = (record) => config.fields.slice(0, 3).map((field) => record.data?.[field.name]).filter((value) => value !== undefined && value !== null && value !== "" && typeof value !== "object").join(" · ") || "No summary values";

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin/textiles/doctype" className="text-sm font-semibold text-indigo-600">← Masters & Documents</Link><h1 className="mt-2 text-3xl font-bold text-slate-900">{config.label}</h1><p className="mt-1 text-sm text-slate-500">{config.category} · {config.fields.length} configured fields</p></div>
      <div className="flex flex-wrap gap-2">{isMaster && <><button type="button" onClick={() => downloadMasterTemplate(config, slug).catch(() => toast.error("Unable to create Excel template"))} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"><Download size={16} />Excel Template</button><button type="button" disabled={importing} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Upload size={16} />{importing ? "Importing..." : "Upload Excel"}</button><input ref={fileInput} onChange={importExcel} type="file" accept=".xlsx,.xls,.csv" className="hidden" /></>}
        <Link href={`/admin/textiles/doctype/${slug}/new`} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} />New {config.label}</Link></div></div>
    {isMaster && <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">Download the template, keep its headers unchanged, enter one record per row, then upload it here. The complete file is validated before records are created.</div>}
    <form onSubmit={(event) => { event.preventDefault(); setLoading(true); load(); }} className="mb-4 flex max-w-xl gap-2"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search document number" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-400" /></div><button className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">Search</button></form>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid grid-cols-[1.2fr_2fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500"><span>Document</span><span>Summary</span><span>Status</span><span>Actions</span></div>
      {loading ? <div className="p-10 text-center text-sm text-slate-400">Loading…</div> : !records.length ? <div className="p-12 text-center"><p className="text-sm text-slate-500">No {config.label} records yet.</p><Link href={`/admin/textiles/doctype/${slug}/new`} className="mt-3 inline-block text-sm font-bold text-indigo-600">Create the first record</Link></div> : records.map((record) => <div key={record._id} className="grid grid-cols-[1.2fr_2fr_1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0"><strong className="text-slate-800">{record.documentNumber}</strong><span className="truncate text-slate-500">{summary(record)}</span><span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{record.status}</span></span><span className="flex gap-1"><Link href={`/admin/textiles/doctype/${slug}/${record._id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye size={15} /></Link><Link href={`/admin/textiles/doctype/${slug}/${record._id}/edit`} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"><Pencil size={15} /></Link><button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button></span></div>)}
    </div>
  </div></div>;
}
