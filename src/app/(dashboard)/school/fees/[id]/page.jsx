"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { FaArrowLeft, FaPrint, FaCheckCircle, FaRupeeSign } from "react-icons/fa";
import { toast } from "react-toastify";

export default function FeeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFee = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/fees/${id}`, headers);
        setFee(res.data.data);
      } catch (err) {
        toast.error("Failed to load fee details");
      } finally {
        setLoading(false);
      }
    };
    fetchFee();
  }, [id]);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR", 
      maximumFractionDigits: 0 
    }).format(num || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!fee) {
    return <div className="text-center py-12 text-gray-400">Fee record not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all">
            <FaArrowLeft size={22} />
          </button>
          <h1 className="text-3xl font-bold">Fee Receipt</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Receipt Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-75">RECEIPT NO.</div>
                <div className="text-3xl font-bold tracking-wider">{fee.receiptNumber}</div>
              </div>
              <button
                onClick={() => window.open(`/api/school/fees/${id}/receipt`, "_blank")}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 rounded-2xl hover:bg-gray-100 transition font-medium"
              >
                <FaPrint /> Print
              </button>
            </div>
            <p className="mt-4 opacity-75">School Fee Receipt</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Student Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Student</p>
                <p className="font-semibold text-lg">{fee.student?.firstName} {fee.student?.lastName}</p>
                <p className="text-gray-600 text-sm">{fee.student?.studentId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Class</p>
                <p className="font-semibold text-lg">
                  {fee.student?.class}{fee.student?.section ? `-${fee.student?.section}` : ""}
                </p>
              </div>
            </div>

            {/* Fee Details */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Fee Head</span>
                <span className="font-medium">{fee.feeHead}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-bold text-2xl text-emerald-600">{formatCurrency(fee.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date</span>
                <span>{new Date(fee.dueDate).toLocaleDateString("en-GB")}</span>
              </div>
              {fee.paidDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid On</span>
                  <span className="text-emerald-600 font-medium">
                    {new Date(fee.paidDate).toLocaleDateString("en-GB")}
                  </span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex justify-between items-center py-4 border-t border-b">
              <span className="text-gray-600">Status</span>
              <span className={`px-5 py-2 rounded-2xl text-sm font-semibold ${
                fee.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                fee.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              }`}>
                {fee.status.toUpperCase()}
              </span>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-gray-500">Payment Method</span>
                <p className="font-medium mt-1">{fee.paymentMethod ? fee.paymentMethod.toUpperCase() : "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Collected By</span>
                <p className="font-medium mt-1">{fee.collectedBy?.name || "—"}</p>
              </div>
            </div>

            {fee.remarks && (
              <div>
                <span className="text-gray-500 text-sm">Remarks</span>
                <p className="mt-1 italic text-gray-700">{fee.remarks}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t p-6 text-center text-xs text-gray-400">
            Thank you for your payment • School Management System
          </div>
        </motion.div>
      </div>
    </div>
  );
}