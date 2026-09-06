"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, Cog, FileCheck2, Landmark, Save, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const links = [
  ["Departments", "Maintain the organisation structure", "/admin/hr/departments", Landmark],
  ["Designations", "Manage employee roles and levels", "/admin/hr/designations", Users],
  ["Shifts", "Configure working hours and schedules", "/admin/hr/shifts", Clock3],
  ["Holidays", "Define public and company holidays", "/admin/hr/holidays", CalendarDays],
  ["Leave balances", "Review leave policy allocations", "/admin/hr/leave-balances", FileCheck2],
];

export default function HrSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({ weekend: "Sunday", autoApproval: false, attendanceReminder: true });
  useEffect(() => { try { const value = localStorage.getItem("hr-settings"); if (value) setSettings(JSON.parse(value)); } catch {} }, []);
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const save = () => { localStorage.setItem("hr-settings", JSON.stringify(settings)); setSaved(true); setTimeout(() => setSaved(false), 2200); };
  return <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-10"><div className="mx-auto max-w-6xl">
    <div className="mb-8 rounded-3xl border border-indigo-100 bg-white p-8 text-slate-900 shadow-sm"><div className="flex items-center gap-4"><div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600"><Cog size={28} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">HR administration</p><h1 className="mt-1 text-3xl font-black">HR Settings</h1><p className="mt-2 text-sm text-slate-500">Configure workforce policies and manage the master data used across HR.</p></div></div></div>
    <div className="grid gap-6 lg:grid-cols-5"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3"><div className="mb-6 flex items-center justify-between"><div><h2 className="font-black text-slate-900">HR preferences</h2><p className="mt-1 text-sm text-slate-500">Defaults used by attendance and leave workflows.</p></div><ShieldCheck className="text-indigo-500" size={22} /></div><div className="space-y-5"><label className="block text-sm font-semibold text-slate-700">Weekly weekend<select value={settings.weekend} onChange={(e) => update("weekend", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"><option>Sunday</option><option>Saturday</option><option>Saturday & Sunday</option></select></label><Toggle label="Automatic leave approval" description="Approve requests that meet configured policy rules." checked={settings.autoApproval} onChange={(v) => update("autoApproval", v)} /><Toggle label="Attendance reminders" description="Remind employees to complete daily punch-out." checked={settings.attendanceReminder} onChange={(v) => update("attendanceReminder", v)} /></div><button onClick={save} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Save size={16} /> {saved ? "Saved" : "Save preferences"}</button></section><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"><h2 className="font-black text-slate-900">Configuration</h2><p className="mt-1 text-sm text-slate-500">Manage HR master data and policies.</p><div className="mt-5 space-y-2">{links.map(([title, description, href, Icon]) => <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-indigo-100 hover:bg-indigo-50"><span className="rounded-lg bg-slate-100 p-2 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">{title}</span><span className="block truncate text-xs text-slate-500">{description}</span></span><ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600" /></Link>)}</div></section></div>
  </div></div>;
}

function Toggle({ label, description, checked, onChange }) { return <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div><button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></button></div>; }
