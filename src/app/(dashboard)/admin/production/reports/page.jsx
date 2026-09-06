"use client";

import { useRouter } from "next/navigation";
import {
  FaClipboardList,
  FaBoxes,
  FaBox,
  FaChartLine,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaUserCog,
  FaIndustry,
  FaClock,
  FaExclamationTriangle,
  FaArrowRight,
} from "react-icons/fa";

export default function ReportsLanding() {
  const router = useRouter();

  const reports = [
    {
      title: "Production Orders Report",
      description: "Comprehensive summary of production orders, quantities, and completion status.",
      icon: <FaClipboardList className="text-3xl text-indigo-500" />,
      path: "/admin/production/reports/production-orders",
      color: "indigo",
    },
    {
      title: "BOM Usage Report",
      description: "Analyze which BOMs are used most, total quantities produced, and average cost.",
      icon: <FaBoxes className="text-3xl text-emerald-500" />,
      path: "/admin/production/reports/bom-usage",
      color: "emerald",
    },
    {
      title: "Material Consumption Report",
      description: "Track raw material and resource consumption across all production orders.",
      icon: <FaBox className="text-3xl text-amber-500" />,
      path: "/admin/production/reports/material-consumption",
      color: "amber",
    },
    {
      title: "Production Efficiency",
      description: "Compare planned vs. actual progress, identify bottlenecks.",
      icon: <FaChartLine className="text-3xl text-blue-500" />,
      path: "/admin/production/reports/efficiency",
      color: "blue",
    },
    {
      title: "Cost Analysis",
      description: "Detailed cost breakdown by materials, resources, and operations.",
      icon: <FaMoneyBillWave className="text-3xl text-red-500" />,
      path: "/admin/production/reports/cost",
      color: "red",
    },
    {
      title: "Production Summary",
      description: "Daily or weekly aggregated production output and cost.",
      icon: <FaCalendarAlt className="text-3xl text-purple-500" />,
      path: "/admin/production/reports/production-summary",
      color: "purple",
    },
    {
      title: "Operator Performance",
      description: "Workload and estimated cost per operator.",
      icon: <FaUserCog className="text-3xl text-pink-500" />,
      path: "/admin/production/reports/operator-performance",
      color: "pink",
    },
    {
      title: "Machine Utilisation",
      description: "Machine usage across orders.",
      icon: <FaIndustry className="text-3xl text-gray-700" />,
      path: "/admin/production/reports/machine-utilisation",
      color: "gray",
    },
    {
      title: "Inventory Impact",
      description: "Material consumption impact on inventory.",
      icon: <FaBox className="text-3xl text-orange-500" />,
      path: "/admin/production/reports/inventory-impact",
      color: "orange",
    },
    {
      title: "Order Status Timeline",
      description: "Time spent in each production stage.",
      icon: <FaClock className="text-3xl text-cyan-500" />,
      path: "/admin/production/reports/order-timeline",
      color: "cyan",
    },
    {
      title: "Pending Orders",
      description: "Orders not yet fully received.",
      icon: <FaExclamationTriangle className="text-3xl text-red-600" />,
      path: "/admin/production/reports/pending-orders",
      color: "red",
    },
    {
  title: "Supplier / Manufacturer Performance",
  description: "Aggregate supplier performance – total supply quantity, cost, and average price.",
  icon: <FaIndustry className="text-3xl text-purple-500" />,
  path: "/admin/production/reports/supplier-performance",
  color: "purple",
},
{
  title: "Sales Order vs Production",
  description: "See how production orders fulfil sales orders – ordered vs received quantities.",
  icon: <FaClipboardList className="text-3xl text-rose-500" />,
  path: "/admin/production/reports/sales-production",
  color: "rose",
},
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Production Reports</h1>
          <p className="text-sm text-gray-400">Select a report to view detailed insights</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((rep) => (
            <div
              key={rep.path}
              onClick={() => router.push(rep.path)}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-indigo-200 group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl bg-${rep.color}-50`}>{rep.icon}</div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600">
                  {rep.title}
                </h2>
              </div>
              <p className="text-sm text-gray-500">{rep.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}