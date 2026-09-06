"use client";

import { useState } from "react";

export default function ReportFilters({ onFilter, initialFilters = {} }) {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    class: "",
    status: "",
    ...initialFilters,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilter(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleChange}
          className="border border-gray-200 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleChange}
          className="border border-gray-200 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Class</label>
        <select
          name="class"
          value={filters.class}
          onChange={handleChange}
          className="border border-gray-200 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">All Classes</option>
          {["1","2","3","4","5","6","7","8","9","10","11","12"].map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</label>
        <select
          name="type"
          value={filters.type}
          onChange={handleChange}
          className="border border-gray-200 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">All Types</option>
          <option value="student">Student</option>
          <option value="staff">Staff</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
        <select
          name="status"
          value={filters.status}
          onChange={handleChange}
          className="border border-gray-200 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md">
        Apply Filters
      </button>
    </form>
  );
}