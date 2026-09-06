"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaClipboardList, FaFileInvoice, FaInbox, FaWarehouse } from "react-icons/fa";

const sections = [
  { href: "/admin/textiles/job-work/requests", label: "Requests", hint: "Plan & approve", icon: FaClipboardList },
  { href: "/admin/textiles/job-work/challans", label: "Challans", hint: "Send to vendor", icon: FaFileInvoice },
  { href: "/admin/textiles/job-work/receipts", label: "Receipts", hint: "Receive fabric", icon: FaInbox },
  { href: "/admin/textiles/job-work/vendor-stock", label: "Vendor Stock", hint: "Track pending", icon: FaWarehouse },
];

export default function JobWorkLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Textile Operations</p>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900">Job Work Control</h1>
          </div>
          <nav className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Job work sections">
            {sections.map(({ href, label, hint, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 transition ${active ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50"}`}>
                  <span className={`rounded-lg p-2 ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}><Icon size={14} /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{label}</span><span className="hidden truncate text-[11px] text-slate-400 sm:block">{hint}</span></span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-7xl">{children}</main>
    </div>
  );
}
