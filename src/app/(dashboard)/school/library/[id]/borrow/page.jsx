"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { FaArrowLeft, FaSave, FaBook, FaUser } from "react-icons/fa";
import { toast } from "react-toastify";

export default function BorrowBook() {
  const { id } = useParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    const fetchData = async () => {
      try {
        const [bookRes, studentsRes] = await Promise.all([
          api.get(`/school/library/${id}`, headers),
          api.get("/school/students", { params: { limit: 1000, isActive: true }, ...headers }),
        ]);
        setBook(bookRes.data.data);
        setStudents(studentsRes.data.data || []);
      } catch (err) {
        toast.error("Failed to load data");
        router.push("/school/library");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.studentId) {
      toast.error("Please select a student");
      return;
    }
    if (!formData.dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post("/school/library/borrow", {
        bookId: id,
        studentId: formData.studentId,
        dueDate: formData.dueDate,
      }, headers);
      toast.success("Book borrowed successfully");
      router.push(`/school/library/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Borrow failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-700">Book not found</h3>
      </div>
    );
  }

  return (
    <div>
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
      >
        <FaArrowLeft size={20} />
        <span>Back</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-lg mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <FaBook size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Borrow Book</h2>
            <p className="text-sm text-gray-500">Issue a book to a student</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
          <p className="text-sm font-medium text-gray-700">{book.title}</p>
          <p className="text-xs text-gray-400">by {book.author}</p>
          <p className="text-xs text-emerald-600 mt-1">Available: {book.availableQuantity}</p>
        </div>
        <div>
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    Scan Barcode
  </label>
  <input
    type="text"
    placeholder="Scan student ID or book ID"
    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        // Auto-fill student dropdown if barcode matches a student
        const value = e.target.value.trim();
        const matchedStudent = students.find(
          (s) => s.studentId === value || s.barcode === value
        );
        if (matchedStudent) {
          setFormData((prev) => ({ ...prev, studentId: matchedStudent._id }));
          toast.success(`Found: ${matchedStudent.firstName} ${matchedStudent.lastName}`);
        } else {
          toast.error("No student found with this barcode");
        }
        e.target.value = "";
      }
    }}
  />
  <p className="text-xs text-gray-400 mt-1">
    Scan student barcode and press Enter to auto-select
  </p>
</div>
        <form>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Student *</label>
              <select
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName} - {s.studentId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date *</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition disabled:opacity-60 shadow-md"
            >
              <FaSave /> {saving ? "Borrowing..." : "Borrow Book"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}