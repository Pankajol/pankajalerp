"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Select from "react-select";
import { FaArrowLeft, FaSave, FaRupeeSign, FaCalendarAlt } from "react-icons/fa";
import { toast } from "react-toastify";

export default function CollectFee() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);

  const [formData, setFormData] = useState({
    student: "",
    feeHead: "Tuition Fee",
    amount: "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
    paymentMethod: "cash",
    remarks: "",
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/students", { params: { limit: 1000 }, ...headers });
        setStudents(res.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student || !formData.amount) {
      toast.warning("Please select a student and enter amount");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post("/school/fees", formData, headers);
      toast.success("💰 Fee collected successfully!");
      setTimeout(() => router.push("/school/fees"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to collect fee");
    } finally {
      setSaving(false);
    }
  };

  const studentOptions = students.map((s) => ({
    value: s._id,
    label: `${s.studentId} - ${s.firstName} ${s.lastName} (${s.class}${s.section ? `-${s.section}` : ""})`,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all">
            <FaArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Collect Fee
            </h1>
            <p className="text-gray-500 mt-1">Record new fee payment</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Student *</label>
              <Select
                options={studentOptions}
                value={studentOptions.find((o) => o.value === formData.student)}
                onChange={(opt) => setFormData((prev) => ({ ...prev, student: opt?.value || "" }))}
                placeholder="Search and select student..."
                isClearable
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '16px',
                    padding: '8px 4px',
                    minHeight: '56px',
                    borderColor: '#e5e7eb',
                  }),
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fee Head *</label>
                <input
                  type="text"
                  name="feeHead"
                  value={formData.feeHead}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹) *</label>
                <div className="relative">
                  <FaRupeeSign className="absolute left-5 top-4 text-gray-400" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl pl-12 pr-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    required
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date *</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="online">Online Payment</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks / Note</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-y"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-8 py-3 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.student || !formData.amount}
                className="flex items-center gap-3 px-10 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg disabled:opacity-70 transition"
              >
                <FaSave /> {saving ? "Processing..." : "Collect Fee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}