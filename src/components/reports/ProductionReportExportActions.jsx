"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

const fileSafeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function getTableData(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return { headers: [], rows: [] };

  const headers = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent.trim());
  const rows = Array.from(table.querySelectorAll("tbody tr")).map((row) =>
    Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent.replace(/\s+/g, " ").trim())
  );
  return { headers, rows };
}

export default function ProductionReportExportActions({ title, tableId }) {
  const exportExcel = () => {
    const { headers, rows } = getTableData(tableId);
    const sheet = XLSX.utils.aoa_to_sheet([[title], [], headers, ...rows]);
    sheet["!cols"] = headers.map((header, index) => ({
      wch: Math.min(36, Math.max(header.length + 3, ...rows.map((row) => (row[index] || "").length + 2))),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    XLSX.writeFile(workbook, `${fileSafeName(title)}.xlsx`);
  };

  const exportPdf = () => {
    const { headers, rows } = getTableData(tableId);
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, 297, 25, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text(title, 14, 15);
    pdf.setFontSize(9);
    pdf.text(`Generated ${new Date().toLocaleString()}`, 14, 21);
    pdf.setTextColor(31, 41, 55);
    autoTable(pdf, {
      head: [headers],
      body: rows,
      startY: 32,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
    });
    pdf.save(`${fileSafeName(title)}.pdf`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400"><Download size={14} /> Export</span>
      <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100">
        <FileSpreadsheet size={15} /> Excel
      </button>
      <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100">
        <FileText size={15} /> PDF
      </button>
    </div>
  );
}
