"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaBook,
  FaUserTie,
  FaTags,
  FaInfoCircle,
  FaBarcode,
  FaCalendarAlt,
  FaEdit,
  FaTrash,
  FaCopy,
  FaBuilding,
  FaMapMarkerAlt,
  FaPlus
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function BookDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Decode token to get user info
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        setUser(jwtDecode(token));
      } catch {
        setUser(null);
      }
    }
  }, []);

  // Fetch book
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/library/${id}`, headers);
        setBook(res.data.data);
      } catch (err) {
        toast.error("Failed to load book");
        router.push("/school/library");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, router]);

  // Determine user roles
  const roles = (user?.roles || []).map((r) => r.toLowerCase());
  const isTeacher = user?.type === "company" ||
    roles.some((r) => ["admin", "school admin", "principal", "teacher",
      "project manager", "site engineer", "project coordinator",
      "site supervisor", "accounts manager", "purchase manager"].includes(r));

  const handleDelete = async () => {
    if (!confirm("Delete this book?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/library/${id}`, headers);
      toast.success("Book deleted");
      router.push("/school/library");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading book details...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaBook size={40} className="text-red-300" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700">Book not found</h3>
        <button
          onClick={() => router.push("/school/library")}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
      >
        <FaArrowLeft size={20} />
        <span>Back</span>
      </motion.button>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md">
                <FaBook size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{book.title}</h1>
                <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <FaBarcode size={12} className="text-indigo-400" />
                    {book.bookId}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaUserTie size={12} className="text-indigo-400" />
                    {book.author}
                  </span>
                  {book.category && (
                    <span className="flex items-center gap-1">
                      <FaTags size={12} className="text-indigo-400" />
                      {book.category}
                    </span>
                  )}
                </p>
              </div>
              
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Availability badge */}
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                book.availableQuantity > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}>
                <FaCopy size={12} />
                {book.availableQuantity} / {book.quantity} available
              </span>

              {/* Edit & Delete – only for teachers */}
              {isTeacher && (
                <>
                   <button
      onClick={() => router.push(`/school/library/${id}/borrow`)}
      className="px-4 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition text-sm flex items-center gap-2 shadow-md"
    >
      <FaPlus size={14} /> Borrow
    </button>
                  <button
                    onClick={() => router.push(`/school/library/${id}/edit`)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition text-sm flex items-center gap-2 shadow-md"
                  >
                    <FaEdit size={14} /> Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition text-sm flex items-center gap-2 shadow-md"
                  >
                    <FaTrash size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Book Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaBarcode size={14} className="text-indigo-400" />
                Book ID
              </div>
              <p className="font-medium text-gray-800">{book.bookId}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaUserTie size={14} className="text-indigo-400" />
                Author
              </div>
              <p className="font-medium text-gray-800">{book.author}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaTags size={14} className="text-indigo-400" />
                Category
              </div>
              <p className="font-medium text-gray-800">{book.category || "—"}</p>
            </div>

            {/* ISBN, Publisher, Year */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaBarcode size={14} className="text-indigo-400" />
                ISBN
              </div>
              <p className="font-medium text-gray-800">{book.isbn || "—"}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaBuilding size={14} className="text-indigo-400" />
                Publisher
              </div>
              <p className="font-medium text-gray-800">{book.publisher || "—"}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaCalendarAlt size={14} className="text-indigo-400" />
                Publication Year
              </div>
              <p className="font-medium text-gray-800">{book.publicationYear || "—"}</p>
            </div>

            {/* Quantity, Location, Description */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaCopy size={14} className="text-indigo-400" />
                Quantity
              </div>
              <p className="font-medium text-gray-800">{book.quantity}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaCopy size={14} className="text-emerald-400" />
                Available
              </div>
              <p className="font-medium text-emerald-600">{book.availableQuantity}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FaMapMarkerAlt size={14} className="text-indigo-400" />
                Location
              </div>
              <p className="font-medium text-gray-800">{book.location || "—"}</p>
            </div>
          </div>

          {/* Description – full width */}
          {book.description && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <FaInfoCircle size={14} className="text-indigo-400" />
                Description
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{book.description}</p>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}