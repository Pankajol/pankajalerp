"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaSearch, FaQrcode } from "react-icons/fa";
import { toast } from "react-toastify";

export default function TraceabilitySearchPage() {
  const router = useRouter();
  const [takaNumber, setTakaNumber] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!takaNumber.trim()) {
      return toast.warn("Please enter a Taka number");
    }
    router.push(`/admin/textiles/traceability/${takaNumber.trim()}`);
  };

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <FaQrcode size={28} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Traceability</h1>
          <p className="text-sm text-gray-500">Find complete history of any Taka</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-6xl mb-6">🔗</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Enter Taka Number</h3>
          <p className="text-gray-500 text-sm mb-6">
            Enter a Taka number (e.g., TAKA-0001) to see its complete lifecycle
          </p>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={takaNumber}
                onChange={(e) => setTakaNumber(e.target.value)}
                placeholder="e.g., TAKA-0001 or scan QR code..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md"
            >
              Trace
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-400">Example: TAKA-0001, TAKA-0042</p>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-2xl">📦</div>
              <p className="text-xs text-gray-500 mt-1">Production</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-2xl">📤</div>
              <p className="text-xs text-gray-500 mt-1">Job Work</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-2xl">🔬</div>
              <p className="text-xs text-gray-500 mt-1">QC</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-2xl">🏢</div>
              <p className="text-xs text-gray-500 mt-1">Warehouse</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}