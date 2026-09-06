"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { FaPlus, FaEdit, FaTrash, FaEye, FaYarn, FaBox } from "react-icons/fa";
import { toast } from "react-toastify";

export default function TextileProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("all");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/items?isTextile=true&search=${encodeURIComponent(search)}`, headers);
      setProducts(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/items/${id}`, headers);
      toast.success("Product deleted");
      fetchProducts();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <span className="text-3xl">🧵</span> Textile Products
          </h1>
          <p className="text-sm text-gray-400">Manage yarn, fabric, garments & accessories</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search..."
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link
            href="/admin/item?type=textile"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all"
          >
            <FaPlus size={12} /> Add Product
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Code</th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Name</th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Type</th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Price</th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">Stock</th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No products found</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">{p.itemCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{p.itemName}</td>
                    <td className="px-6 py-4 text-gray-600 capitalize">{p.textileItemType || p.itemType || "N/A"}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-700">₹{p.unitPrice || 0}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-600">{p.quantity || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/admin/item/${p._id}`} className="p-2 text-gray-400 hover:text-indigo-600" aria-label={`View ${p.itemName}`}><FaEye size={14} /></Link>
                      <Link href={`/admin/item/${p._id}`} className="p-2 text-gray-400 hover:text-indigo-600" aria-label={`Edit ${p.itemName}`}><FaEdit size={14} /></Link>
                      <button onClick={() => handleDelete(p._id)} className="p-2 text-gray-400 hover:text-red-500"><FaTrash size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
