"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaEdit,
  FaEye,
  FaBook,
  FaUserTie,
  FaTags,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchBooks = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 10, search };
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get("/school/library", { params, ...headers });
      setBooks(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this book?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/library/${id}`, headers);
      toast.success("Book deleted");
      fetchBooks(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  // Unique categories for filter dropdown
  const categories = [...new Set(books.map((b) => b.category).filter(Boolean))];

  return (
    <div>
      {/* Header with Count */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBook className="text-indigo-500" size={24} />
            Library
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {meta.total} {meta.total === 1 ? "book" : "books"} total
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/school/library/create")}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
        >
          <FaPlus /> Add Book
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, author, ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button
          onClick={() => fetchBooks(1)}
          className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition font-medium"
        >
          Apply Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Book ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Author
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Category
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Qty
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Available
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <FaBook size={32} className="text-indigo-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">No books found</h3>
                      <p className="text-gray-400 mt-1">
                        {search || categoryFilter
                          ? "Try adjusting your filters"
                          : "Add your first book to the library"}
                      </p>
                      {!search && !categoryFilter && (
                        <button
                          onClick={() => router.push("/school/library/create")}
                          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
                        >
                          Add Book
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                books.map((book, idx) => (
                  <motion.tr
                    key={book._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50 transition group"
                  >
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      {book.bookId}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{book.title}</td>
                    <td className="px-6 py-4 text-gray-600">{book.author}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {book.category ? (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
                          <FaTags size={10} />
                          {book.category}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">{book.quantity}</td>
                    <td className="px-6 py-4 text-center font-bold text-emerald-600">
                      {book.availableQuantity}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/school/library/${book._id}`)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="View details"
                      >
                        <FaEye size={15} />
                      </button>
                      <button
                        onClick={() => router.push(`/school/library/${book._id}/edit`)}
                        className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                        title="Edit book"
                      >
                        <FaEdit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(book._id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete book"
                      >
                        <FaTrash size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Page {meta.page} of {meta.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchBooks(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => fetchBooks(meta.page + 1)}
                disabled={meta.page >= meta.pages}
                className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}