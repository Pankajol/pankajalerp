"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Banknote,
  BookOpenCheck,
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  Landmark,
  ReceiptText,
  ShoppingCart,
  Users,
} from "lucide-react";

const salesFlow = [
  { label: "Customers", description: "Maintain customer accounts and tax details.", href: "/admin/customers", icon: Users },
  { label: "Sales Quotations", description: "Create and track customer quotations.", href: "/admin/sales-quotation-view", icon: FileText },
  { label: "Sales Orders", description: "Convert accepted quotations into orders.", href: "/admin/sales-order-view", icon: ClipboardList },
  { label: "Sales Invoices", description: "Post receivables and GST from sales.", href: "/admin/sales-invoice-view", icon: ReceiptText },
  { label: "Customer Receipts", description: "Record payments against customer invoices.", href: "/admin/Payment", icon: Banknote },
  { label: "Credit Notes", description: "Process sales returns and reduce receivables.", href: "/admin/credit-memo-veiw", icon: FileCheck2 },
  { label: "Debit Notes", description: "Record customer debit adjustments when required.", href: "/admin/debit-notes-view", icon: FileCheck2 },
];

const purchaseFlow = [
  { label: "Suppliers", description: "Maintain supplier accounts and payment terms.", href: "/admin/supplier", icon: Building2 },
  { label: "Purchase Quotations", description: "Compare supplier quotations.", href: "/admin/PurchaseQuotationList", icon: FileText },
  { label: "Purchase Orders", description: "Authorize supplier commitments.", href: "/admin/purchase-order-view", icon: ClipboardList },
  { label: "Purchase Receipts", description: "Record received goods before billing.", href: "/admin/PurchaseReceiptForm", icon: ShoppingCart },
  { label: "Purchase Invoices", description: "Post payables and input GST.", href: "/admin/purchaseInvoice-view", icon: ReceiptText },

  { label: "Supplier Payments", description: "Settle supplier invoices from cash or bank.", href: "/admin/Payment", icon: Banknote },
];

const financeControls = [
  { label: "Customer Ageing", href: "/admin/finance/report/ageing/customer", icon: Users },
  { label: "Supplier Ageing", href: "/admin/finance/report/ageing/supplier", icon: Building2 },
  { label: "Customer Statement", href: "/admin/finance/report/statement/customer", icon: FileText },
  { label: "Supplier Statement", href: "/admin/finance/report/statement/supplier", icon: FileText },
  { label: "Bank Reconciliation", href: "/admin/finance/report/bank-reconciliation", icon: Landmark },
  { label: "Journal Entries", href: "/admin/finance/journal-entry", icon: BookOpenCheck },
  { label: "GST Reports", href: "/admin/finance/report/gst", icon: ReceiptText },
  { label: "Financial Reports", href: "/admin/finance/report", icon: BarChart3 },
];

function FlowCard({ step, item, color }) {
  const Icon = item.icon;
  return (
    <div className="relative flex gap-3">
      <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color} text-white text-xs font-bold`}>{step}</div>
      <Link href={item.href} className="group mb-5 flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
        <div className="flex gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600"><Icon size={18} /></div>
          <div>
            <p className="text-sm font-bold text-slate-900">{item.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
          </div>
        </div>
        <ArrowRight size={17} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
      </Link>
    </div>
  );
}

export default function FinanceFlowPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Finance operations</p>
            <h1 className="text-2xl font-bold text-slate-900">Sales, Purchase & Finance Flow</h1>
            <p className="mt-1 text-sm text-slate-500">Follow each document from customer or supplier setup through payment and financial reporting.</p>
          </div>
          <Link href="/admin/finance" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700">
            <BadgeIndianRupee size={17} /> Finance dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-emerald-600 p-2.5 text-white"><Users size={21} /></div><div><h2 className="font-bold text-slate-900">Sales to collection</h2><p className="text-xs text-slate-500">Customer → quotation → order → invoice → receipt</p></div></div>
            <div className="relative before:absolute before:bottom-7 before:left-[17px] before:top-7 before:w-px before:bg-emerald-200">
              {salesFlow.map((item, index) => <FlowCard key={item.href} step={index + 1} item={item} color="bg-emerald-600" />)}
            </div>
          </section>

          <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-amber-500 p-2.5 text-white"><Building2 size={21} /></div><div><h2 className="font-bold text-slate-900">Purchase to payment</h2><p className="text-xs text-slate-500">Supplier → quotation → order → receipt → invoice → payment</p></div></div>
            <div className="relative before:absolute before:bottom-7 before:left-[17px] before:top-7 before:w-px before:bg-amber-200">
              {purchaseFlow.map((item, index) => <FlowCard key={item.href} step={index + 1} item={item} color="bg-amber-500" />)}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="font-bold text-slate-900">Close, reconcile & report</h2><p className="mt-1 text-sm text-slate-500">Use these finance screens to monitor balances, reconcile bank movements, and close the reporting period.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {financeControls.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="group flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/40"><span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon size={16} className="text-indigo-500" />{item.label}</span><ArrowRight size={15} className="text-slate-300 group-hover:text-indigo-600" /></Link>; })}
          </div>
        </section>
      </div>
    </main>
  );
}
