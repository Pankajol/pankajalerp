"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Package,
  Factory,
  CheckCircle,
  Layers,
  Plus,
  TrendingUp,
  Beaker,
  RefreshCw,
  Boxes,
  Route,
  ClipboardCheck,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "react-toastify";

export default function TextilesDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    productionOrders: 0,
    recipes: 0,
    stockItems: 0,
    pendingOrders: 0,
    pendingQc: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [charts, setCharts] = useState({ production: [], jobWork: [], quality: [], inventory: [] });
  const [sources, setSources] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const response = await api.get("/textiles/dashboard", headers);
      const data = response.data?.data;
      if (!data) throw new Error(response.data?.message || "Textile dashboard data is unavailable");

      setStats({
        products: data.summary.products,
        productionOrders: data.summary.productionOrders,
        recipes: data.summary.recipes,
        stockItems: data.summary.availableTakas,
        pendingOrders: data.summary.activeJobWork,
        pendingQc: data.summary.pendingQc,
      });

      setRecentOrders(data.recentOrders || []);
      setLowStock(data.lowStock || []);
      setCharts(data.charts || { production: [], jobWork: [], quality: [], inventory: [] });
      setSources(data.sources || []);

      if (showToast) {
        toast.success("✅ Dashboard refreshed!");
      }
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to load dashboard data");
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const StatSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
          <div className="h-8 w-12 bg-gray-200 rounded" />
        </div>
        <div className="w-11 h-11 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, color, href, subtitle }) => {
    const colorClasses = {
      indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
      emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
      amber: "bg-amber-50 text-amber-600 border-amber-100",
      rose: "bg-rose-50 text-rose-600 border-rose-100",
      blue: "bg-blue-50 text-blue-600 border-blue-100",
      purple: "bg-purple-50 text-purple-600 border-purple-100",
    };
    return (
      <Link
        href={href}
        className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all hover:-translate-y-0.5 block"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div
            className={`w-11 h-11 rounded-2xl ${colorClasses[color]} flex items-center justify-center text-lg`}
          >
            <Icon size={20} />
          </div>
        </div>
        <ArrowUpRight size={15} className="absolute bottom-4 right-5 text-slate-300 transition group-hover:text-indigo-600" />
      </Link>
    );
  };

  const StatusBars = ({ title, subtitle, items, color = "indigo" }) => {
    const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const colors = {
      indigo: "from-indigo-500 to-violet-500",
      emerald: "from-emerald-500 to-teal-500",
      amber: "from-amber-400 to-orange-500",
      rose: "from-rose-500 to-pink-500",
    };
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{total}</span>
        </div>
        {items.length ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((item, index) => (
              <div key={`${item.label}-${index}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium capitalize text-slate-600">{String(item.label).replaceAll("-", " ")}</span>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full bg-gradient-to-r ${colors[color]}`} style={{ width: `${Math.max(8, Math.round((Number(item.value || 0) / Math.max(total, 1)) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[148px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-400">No records available yet</div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      {/* Header */}
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 shadow-xl md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="text-3xl">🧵</span> Textiles Dashboard
          </h1>
          <p className="text-indigo-100 text-sm mt-0.5">
            Overview of yarn, fabric, production & quality
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/textiles/flow" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
            <Route size={14} /> Complete Flow
          </Link>
          <Link
            href="/admin/textiles/doctype"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-all"
          >
            <Boxes size={14} /> Masters & Documents
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} size={14} />
            Refresh
          </button>
          <Link
            href="/admin/item?type=textile"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={12} /> New Product
          </Link>
          <Link
            href="/admin/ppc/productionOrderPage?type=textile"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={12} /> New Order
          </Link>
        </div>
      </div></div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button
            onClick={handleRefresh}
            className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {loading && !error ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 mb-6">
          {[...Array(6)].map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 mb-6">
          <StatCard
            title="Textile Products"
            value={stats.products}
            icon={Package}
            color="indigo"
            href="/admin/textiles/products"
          />
          <StatCard
            title="Production Orders"
            value={stats.productionOrders}
            icon={Factory}
            color="amber"
            href="/admin/ppc/productionOrderPage?type=textile"
            subtitle={`${stats.pendingOrders} active job-work request(s)`}
          />
          <StatCard
            title="Dyeing Recipes"
            value={stats.recipes}
            icon={Beaker}
            color="purple"
            href="/admin/textiles/dyeing-recipes"
          />
          <StatCard
            title="Available Takas"
            value={stats.stockItems}
            icon={Layers}
            color="rose"
            href="/admin/textiles/takas"
          />
          <StatCard
            title="Low Stock Alerts"
            value={lowStock.length}
            icon={CheckCircle}
            color="blue"
            href="/admin/InventoryView?isTextile=true&lowStock=true"
          />
          <StatCard
            title="QC Attention"
            value={stats.pendingQc}
            icon={ClipboardCheck}
            color="amber"
            href="/admin/textiles/quality-inspection"
            subtitle="Pending, hold or rework"
          />
        </div>
      )}

      {/* Live operational charts */}
      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Live operations overview</h2>
              <p className="mt-0.5 text-xs text-slate-500">Status distribution from production, job work, quality and fabric rolls.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live data</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <StatusBars title="Production status" subtitle="All production sources" items={charts.production} color="indigo" />
            <StatusBars title="Job work status" subtitle="External processing" items={charts.jobWork} color="amber" />
            <StatusBars title="Quality status" subtitle="Inspection queue" items={charts.quality} color="rose" />
            <StatusBars title="Fabric roll status" subtitle="Taka availability" items={charts.inventory} color="emerald" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Data coverage</h2>
          <p className="mt-0.5 text-xs text-slate-500">Every saved source included in this dashboard.</p>
          <div className="mt-5 space-y-2">
            {sources.map((source) => (
              <Link key={source.label} href={source.href} className="group flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3 transition hover:border-indigo-100 hover:bg-indigo-50/50">
                <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-700">{source.label}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 group-hover:bg-white">{source.value}</span>
              </Link>
            ))}
            {!sources.length && !loading && <p className="py-10 text-center text-sm text-slate-400">No data sources found.</p>}
          </div>
          <Link href="/admin/textiles/flow" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
            View complete textile flow <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Factory className="text-indigo-600" size={18} />
              <h3 className="font-bold text-gray-800">Recent Production Orders</h3>
            </div>
            <Link
              href="/admin/ppc/productionOrderPage?type=textile"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
            >
              View All →
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                    </div>
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p>No orders yet</p>
                <Link
                  href="/admin/ppc/productionOrderPage?type=textile"
                  className="text-indigo-600 text-sm font-medium hover:underline mt-2 inline-block"
                >
                  Create your first order →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link
                    key={order._id}
                    href={order.href || `/admin/ppc/productionOrderPage/${order._id}/jobcards`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {order.displayNumber || order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.displayItem || order.item?.itemName || "Product"} × {order.displayQuantity ?? order.quantity ?? 0}
                        {order.unit ? ` ${order.unit}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : order.status === "in-progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="text-rose-500" size={18} />
              <h3 className="font-bold text-gray-800">Low Stock Alert</h3>
            </div>
            <Link
              href="/admin/InventoryView?isTextile=true&lowStock=true"
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition"
            >
              View All →
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : lowStock.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-gray-400">All products have sufficient stock</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStock.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {product.itemName}
                      </p>
                      <p className="text-xs text-gray-500">{product.itemCode}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                      Stock: {product.stockQuantity} / Reorder:{" "}
                      {product.reorderLevel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
