"use client";

import Link from "next/link";
import { Boxes, ChevronRight } from "lucide-react";
import { getDoctypeGroups } from "@/lib/textiles/doctypeConfig";

export default function TextileDocTypesPage() {
  const groups = getDoctypeGroups();
  return <div className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-7xl"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Textile ERP</p><h1 className="mt-2 text-3xl font-bold text-slate-900">DocType Center</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">All textile masters, manufacturing, processing, quality, roll, job-work, sample and costing records from the functional specification.</p></div><div className="space-y-7">{Object.entries(groups).map(([category, doctypes]) => <section key={category}><h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{category}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{doctypes.map((doctype) => <Link key={doctype.slug} href={`/admin/textiles/doctype/${doctype.slug}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Boxes size={19} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800">{doctype.label}</strong><small className="text-slate-400">{doctype.fields.length} fields</small></span><ChevronRight size={17} className="text-slate-300 group-hover:text-indigo-500" /></Link>)}</div></section>)}</div></div></div>;
}
