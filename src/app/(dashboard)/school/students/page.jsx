"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import * as XLSX from "xlsx";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaSearch,
  FaCheck,
  FaUsers,
  FaFileExcel,
  FaSpinner,
  FaHome,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 15, search };
      if (classFilter) params.class = classFilter;
      if (statusFilter) params.isActive = statusFilter;

      const res = await api.get("/school/students", { params, ...headers });
      setStudents(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [search, classFilter, statusFilter]);

  const handleDelete = async (id, isActive) => {
    const action = isActive ? "disable" : "enable";
    if (!confirm(`Are you sure you want to ${action} this student?`)) return;

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      if (isActive) {
        await api.delete(`/school/students/${id}`, headers);
        toast.success("Student disabled successfully");
      } else {
        await api.patch(`/school/students/${id}`, { action: "enable" }, headers);
        toast.success("Student enabled successfully");
      }
      fetchStudents(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  // --- Excel Import Handler (maps houseInfo fields) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const students = jsonData.map((row) => ({
        studentId: row["Student ID"] || row["studentId"] || "",
        firstName: row["First Name"] || row["firstName"] || "",
        lastName: row["Last Name"] || row["lastName"] || "",
        dateOfBirth: row["Date of Birth"] || row["dateOfBirth"] || "",
        gender: row["Gender"] || row["gender"] || "",
        email: row["Email"] || row["email"] || "",
        phone: row["Phone"] || row["phone"] || "",
        address: row["Address"] || row["address"] || "",
        class: row["Class"] || row["class"] || "",
        section: row["Section"] || row["section"] || "",
        rollNumber: row["Roll No."] || row["rollNumber"] || "",
        // Legacy house (optional)
        house: row["House"] || row["house"] || "",
        // New houseInfo object
        houseInfo: {
          name: row["House Name"] || row["houseInfo.name"] || "",
          line1: row["House Line 1"] || row["houseInfo.line1"] || "",
          line2: row["House Line 2"] || row["houseInfo.line2"] || "",
          city: row["House City"] || row["houseInfo.city"] || "",
          state: row["House State"] || row["houseInfo.state"] || "",
          country: row["House Country"] || row["houseInfo.country"] || "",
          pin: row["House PIN"] || row["houseInfo.pin"] || "",
        },
        parent: {
          name: row["Parent Name"] || row["parent.name"] || "",
          phone: row["Parent Phone"] || row["parent.phone"] || "",
          email: row["Parent Email"] || row["parent.email"] || "",
          relation: row["Parent Relation"] || row["parent.relation"] || "",
        },
        password: row["Password"] || "default123",
        parentPassword: row["Parent Password"] || "default123",
        isActive: row["Active"] !== undefined ? Boolean(row["Active"]) : true,
      }));

      const token = localStorage.getItem("token");
      const res = await api.post(
        "/school/students/bulk",
        { students },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Imported ${res.data.importedCount} students successfully`);
      if (res.data.errors && res.data.errors.length) {
        toast.warning(`Some rows failed: ${res.data.errors.join(", ")}`);
      }
      fetchStudents(meta.page);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // --- Download Template – includes ALL columns including house address ---
  const downloadTemplate = () => {
    const headers = [
      "Student ID",
      "First Name",
      "Last Name",
      "Date of Birth",
      "Gender",
      "Email",
      "Phone",
      "Address",
      "Class",
      "Section",
      "Roll No.",
      "House", // legacy (optional)
      "House Name",
      "House Line 1",
      "House Line 2",
      "House City",
      "House State",
      "House Country",
      "House PIN",
      "Parent Name",
      "Parent Phone",
      "Parent Email",
      "Parent Relation",
      "Password",
      "Parent Password",
      "Active",
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_import_template.xlsx");
  };

  // Helper: build full house address string for tooltip
  const getFullHouseAddress = (info) => {
    if (!info) return "No address";
    const parts = [];
    if (info.line1) parts.push(info.line1);
    if (info.line2) parts.push(info.line2);
    if (info.city) parts.push(info.city);
    if (info.state) parts.push(info.state);
    if (info.country) parts.push(info.country);
    if (info.pin) parts.push(`PIN: ${info.pin}`);
    return parts.length ? parts.join(", ") : "No address";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <FaUsers size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Students</h1>
              <p className="text-gray-500 mt-1">Manage all students in the school</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`cursor-pointer flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all font-medium ${
                uploading ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              {uploading ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
              {uploading ? "Importing..." : "Import Excel"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>

            <button
              onClick={downloadTemplate}
              className="text-sm text-indigo-600 hover:underline px-2"
            >
              Download Template
            </button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/school/students/create")}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all font-medium"
            >
              <FaPlus /> Add New Student
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[280px] relative">
              <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, ID, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Disabled Only</option>
            </select>

            <button
              onClick={() => { setSearch(""); setClassFilter(""); setStatusFilter(""); }}
              className="px-5 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student ID</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Class</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Roll No.</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">House</th>
                  <th className="px-8 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-8 py-6"></td>
                        <td className="px-8 py-6"></td>
                      </tr>
                    ))
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-20 text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FaUsers className="text-3xl text-gray-300" />
                        </div>
                        <p className="text-xl text-gray-400">No students found</p>
                        <p className="text-gray-500 mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    students.map((s, index) => {
                      const houseName = s.houseInfo?.name || s.house?.name || "—";
                      const fullAddress = s.houseInfo ? getFullHouseAddress(s.houseInfo) : "No address";
                      return (
                        <motion.tr
                          key={s._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="group hover:bg-indigo-50/50 transition-all duration-200"
                        >
                          <td className="px-8 py-5 font-mono text-gray-600">{s.studentId}</td>
                          <td className="px-8 py-5 font-medium">{s.firstName} {s.lastName}</td>
                          <td className="px-8 py-5">{s.class}{s.section ? `-${s.section}` : ""}</td>
                          <td className="px-8 py-5 text-gray-600">{s.rollNumber || "—"}</td>
                          <td className="px-8 py-5">
                            <div className="group relative flex items-center gap-1.5 cursor-help">
                              <FaHome className="text-gray-400 text-xs" />
                              <span className="truncate max-w-[120px]">{houseName}</span>
                              {s.houseInfo && (s.houseInfo.line1 || s.houseInfo.city) && (
                                <FaInfoCircle className="text-gray-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                              {/* Tooltip */}
                              {s.houseInfo && (s.houseInfo.line1 || s.houseInfo.city) && (
                                <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-normal">
                                  {fullAddress}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex px-4 py-1 text-xs font-medium rounded-2xl ${
                              s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {s.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-all">
                              <button onClick={() => router.push(`/school/students/${s._id}`)} className="p-2.5 hover:bg-white rounded-xl hover:text-indigo-600 transition-all" title="View Profile">
                                <FaEye size={18} />
                              </button>
                              <button onClick={() => router.push(`/school/students/${s._id}/edit`)} className="p-2.5 hover:bg-white rounded-xl hover:text-blue-600 transition-all" title="Edit">
                                <FaEdit size={18} />
                              </button>
                              <button onClick={() => handleDelete(s._id, s.isActive)} className={`p-2.5 hover:bg-white rounded-xl transition-all ${s.isActive ? "hover:text-red-600" : "hover:text-emerald-600"}`} title={s.isActive ? "Disable" : "Enable"}>
                                {s.isActive ? <FaTrash size={18} /> : <FaCheck size={18} />}
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="px-8 py-5 border-t flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                Showing {(meta.page - 1) * 15 + 1} to {Math.min(meta.page * 15, meta.total)} of {meta.total} students
              </span>
              <div className="flex gap-2">
                <button onClick={() => fetchStudents(meta.page - 1)} disabled={meta.page <= 1} className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-40 transition-all">
                  Previous
                </button>
                <button onClick={() => fetchStudents(meta.page + 1)} disabled={meta.page >= meta.pages} className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-40 transition-all">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}