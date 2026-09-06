"use client";

import { useState } from "react";
import { exportToCSV } from "./exportUtils";
import { FaFileExport } from "react-icons/fa";

export default function ReportTable({ columns, data, title, exportable = true }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    exportToCSV(data, title.replace(/\s/g, "_"));
  };

  return (
    <div>
      {exportable && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition text-sm flex items-center gap-2"
          >
            <FaFileExport /> Export CSV
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50 transition">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-4 py-3">
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}