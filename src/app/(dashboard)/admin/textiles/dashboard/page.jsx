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
} from "lucide-react";
import { toast } from "react-toastify";

export default function TextilesDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    productionOrders: 0,
    recipes: 0,
    stockItems: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const [itemsRes, ordersRes, recipesRes, stockRes] = await Promise.allSettled([
        api.get("/items?isTextile=true", headers),
        api.get("/ppc/production-orders?type=textile", headers),
        api.get("/textiles/dyeing-recipes", headers),
        api.get("/inventory?isTextile=true", headers),
      ]);

      const readList = (result) => {
        if (result.status !== "fulfilled") return [];
        const payload = result.value?.data;
        return payload?.data || payload?.items || payload?.orders || payload?.inventory || [];
      };
      const items = readList(itemsRes);
      const orders = readList(ordersRes);
      const recipes = readList(recipesRes);
      const stock = readList(stockRes);
      const failedCount = [itemsRes, ordersRes, recipesRes, stockRes].filter(
        (result) => result.status === "rejected"
      ).length;
      if (failedCount === 4) throw new Error("Textile services are unavailable");
      if (failedCount) setError(`${failedCount} dashboard data source${failedCount > 1 ? "s" : ""} could not be loaded.`);

      const pending = orders.filter(
        (o) => o.status === "planned" || o.status === "in-progress"
      ).length;

      setStats({
        products: items.length,
        productionOrders: orders.length,
        recipes: recipes.length,
        stockItems: stock.length,
        pendingOrders: pending,
      });

      setRecentOrders(orders.slice(0, 5));

      // Low stock calculation
      const lowStockItems = [];
      items.forEach((item) => {
        const stockItem = stock.find(
          (s) => s.itemId === item._id || s.item === item._id
        );
        if (stockItem && stockItem.quantity < (item.reorderLevel || 0)) {
          lowStockItems.push({
            ...item,
            stockQuantity: stockItem.quantity,
            reorderLevel: item.reorderLevel || 0,
          });
        }
      });
      setLowStock(lowStockItems.slice(0, 5));

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
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 block"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
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
      </Link>
    );
  };

  return (
    <div className="p-8 font-sans bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="text-3xl">🧵</span> Textiles Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
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
      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
            subtitle={`${stats.pendingOrders} Pending`}
          />
          <StatCard
            title="Dyeing Recipes"
            value={stats.recipes}
            icon={Beaker}
            color="purple"
            href="/admin/textiles/dyeing-recipes"
          />
          <StatCard
            title="Stock Items"
            value={stats.stockItems}
            icon={Layers}
            color="rose"
            href="/admin/InventoryView?isTextile=true"
          />
          <StatCard
            title="Low Stock Alerts"
            value={lowStock.length}
            icon={CheckCircle}
            color="blue"
            href="/admin/InventoryView?isTextile=true&lowStock=true"
          />
        </div>
      )}

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
                    href={`/admin/ppc/productionOrderPage/${order._id}/jobcards`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.item?.itemName || "N/A"} × {order.quantity}{" "}
                        {order.unit}
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
