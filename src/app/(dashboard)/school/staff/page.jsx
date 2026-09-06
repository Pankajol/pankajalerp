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
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchStaff = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 15, search };
      if (departmentFilter) params.department = departmentFilter;
      if (statusFilter) params.isActive = statusFilter;

      const res = await api.get("/school/staff", { params, ...headers });
      setStaff(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff(1);
  }, [search, departmentFilter, statusFilter]);

  const handleDelete = async (id, isActive) => {
    const action = isActive ? "disable" : "enable";
    if (!confirm(`Are you sure you want to ${action} this staff member?`)) return;

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      if (isActive) {
        await api.delete(`/school/staff/${id}`, headers);
        toast.success("Staff member disabled successfully");
      } else {
        await api.patch(`/school/staff/${id}`, { action: "enable" }, headers);
        toast.success("Staff member enabled successfully");
      }
      fetchStaff(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  // --- Excel Import Handler (flat fields only; nested arrays ignored) ---
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

      const staffData = jsonData.map((row) => ({
        staffId: row["Staff ID"] || row["staffId"] || "",
        firstName: row["First Name"] || row["firstName"] || "",
        lastName: row["Last Name"] || row["lastName"] || "",
        email: row["Email"] || row["email"] || "",
        password: row["Password"] || "",
        phone: row["Phone"] || row["phone"] || "",
        gender: row["Gender"] || row["gender"] || "male",
        dateOfBirth: row["Date of Birth"] || row["dateOfBirth"] || "",
        joiningDate: row["Joining Date"] || row["joiningDate"] || "",
        designation: row["Designation"] || row["designation"] || "",
        department: row["Department"] || row["department"] || "",
        address: row["Address"] || row["address"] || "",
        emergencyContact: {
          name: row["Emergency Name"] || row["emergencyContact.name"] || "",
          phone: row["Emergency Phone"] || row["emergencyContact.phone"] || "",
          relation: row["Emergency Relation"] || row["emergencyContact.relation"] || "",
        },
        isActive: row["Active"] !== undefined ? Boolean(row["Active"]) : true,
        // qualifications and workExperience are left as empty arrays; user can add later
        qualifications: [],
        workExperience: [],
      }));

      const token = localStorage.getItem("token");
      const res = await api.post(
        "/school/staff/bulk",
        { staff: staffData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Imported ${res.data.importedCount} staff members successfully`);
      if (res.data.errors && res.data.errors.length) {
        toast.warning(`Some rows failed: ${res.data.errors.join(", ")}`);
      }
      fetchStaff(meta.page);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // --- Download Template (includes all flat fields) ---
  const downloadTemplate = () => {
    const headers = [
      "Staff ID",
      "First Name",
      "Last Name",
      "Email",
      "Password",
      "Phone",
      "Gender",
      "Date of Birth",
      "Joining Date",
      "Designation",
      "Department",
      "Address",
      "Emergency Name",
      "Emergency Phone",
      "Emergency Relation",
      "Active",
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "Staff");
    XLSX.writeFile(wb, "staff_import_template.xlsx");
  };

  // Get unique departments
  const departments = [...new Set(staff.map((s) => s.department).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white">
              <FaUsers size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Staff Members</h1>
              <p className="text-gray-500 mt-1">Manage teaching and non-teaching staff</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Import Excel Button */}
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

            {/* Download Template Button */}
            <button
              onClick={downloadTemplate}
              className="text-sm text-violet-600 hover:underline px-2"
            >
              Download Template
            </button>

            {/* Add New Staff Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/school/staff/create")}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl hover:shadow-xl hover:shadow-violet-500/30 transition-all font-medium"
            >
              <FaPlus /> Add New Staff
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
                className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Disabled Only</option>
            </select>

            <button
              onClick={() => { setSearch(""); setDepartmentFilter(""); setStatusFilter(""); }}
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
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Staff ID</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Designation</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Department</th>
                  <th className="px-8 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                        <td className="px-8 py-6"></td>
                        <td className="px-8 py-6"></td>
                      </tr>
                    ))
                  ) : staff.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FaUsers className="text-3xl text-gray-300" />
                        </div>
                        <p className="text-xl text-gray-400">No staff members found</p>
                        <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
                      </td>
                    </tr>
                  ) : (
                    staff.map((s, index) => (
                      <motion.tr
                        key={s._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-violet-50/60 transition-all duration-200"
                      >
                        <td className="px-8 py-5 font-mono text-violet-600 font-medium">{s.staffId}</td>
                        <td className="px-8 py-5 font-medium">
                          {s.firstName} {s.lastName}
                        </td>
                        <td className="px-8 py-5 text-gray-700">{s.designation}</td>
                        <td className="px-8 py-5 text-gray-600">{s.department || "—"}</td>
                        <td className="px-8 py-5 text-center">
                          <span
                            className={`inline-flex px-4 py-1 text-xs font-medium rounded-2xl ${
                              s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {s.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => router.push(`/school/staff/${s._id}`)}
                              className="p-2.5 hover:bg-white rounded-xl hover:text-violet-600 transition-all"
                              title="View Profile"
                            >
                              <FaEye size={18} />
                            </button>
                            <button
                              onClick={() => router.push(`/school/staff/${s._id}/edit`)}
                              className="p-2.5 hover:bg-white rounded-xl hover:text-blue-600 transition-all"
                              title="Edit"
                            >
                              <FaEdit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(s._id, s.isActive)}
                              className={`p-2.5 hover:bg-white rounded-xl transition-all ${
                                s.isActive ? "hover:text-red-600" : "hover:text-emerald-600"
                              }`}
                              title={s.isActive ? "Disable" : "Enable"}
                            >
                              {s.isActive ? <FaTrash size={18} /> : <FaCheck size={18} />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="px-8 py-5 border-t flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                Showing {(meta.page - 1) * 15 + 1} to {Math.min(meta.page * 15, meta.total)} of {meta.total} staff
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchStaff(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchStaff(meta.page + 1)}
                  disabled={meta.page >= meta.pages}
                  className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-40 transition-all"
                >
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