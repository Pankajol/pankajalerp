"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingManual, setSavingManual] = useState(false);
  const [manual, setManual] = useState({ employeeId: "", fromDate: "", toDate: "", leaveType: "Casual", reason: "" });

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/hr/employees", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.data.success) setEmployees(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/hr/leaves", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setLeaves(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitManualLeave = async (event) => {
    event.preventDefault();
    try {
      setSavingManual(true);
      await axios.post("/api/hr/leaves", manual, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setManual({ employeeId: "", fromDate: "", toDate: "", leaveType: "Casual", reason: "" });
      await fetchLeaves();
      alert("Manual leave entry added. You can now approve or reject it below.");
    } catch (err) {
      alert(err.response?.data?.message || "Could not add manual leave");
    } finally { setSavingManual(false); }
  };

  const handleReject = async (id) => {
  const reason = prompt("Enter rejection reason:");

  if (!reason) return;

  updateStatus(id, "Rejected", reason);
};
const updateStatus = async (id, status, reason = "") => {
  try {
    const token = localStorage.getItem("token");

    await axios.patch(
      `/api/hr/leaves/${id}`,
      { status, reason },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    fetchLeaves();
  } catch (err) {
    alert("Failed to update status");
  }
};

  const StatusBadge = ({ status }) => {
    if (status === "Approved")
      return <span className="text-green-600 font-bold">Approved</span>;
    if (status === "Rejected")
      return <span className="text-red-600 font-bold">Rejected</span>;
    return <span className="text-yellow-600 font-bold">Pending</span>;
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Leave Management (Admin)</h1>
        <Link href="/admin/hr/leave-balances" className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
          Define Employee Leave Allocation
        </Link>
      </div>

      <form onSubmit={submitManualLeave} className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4"><h2 className="font-semibold text-lg">Add Manual Leave</h2><p className="text-sm text-gray-500">Create a leave request for any employee.</p></div>
        <div className="grid gap-3 md:grid-cols-3">
          <select required value={manual.employeeId} onChange={(e) => setManual({ ...manual, employeeId: e.target.value })} className="border rounded-lg px-3 py-2">
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName} {employee.employeeCode ? `(${employee.employeeCode})` : ""}</option>)}
          </select>
          <input required type="date" value={manual.fromDate} onChange={(e) => setManual({ ...manual, fromDate: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input required type="date" min={manual.fromDate || undefined} value={manual.toDate} onChange={(e) => setManual({ ...manual, toDate: e.target.value })} className="border rounded-lg px-3 py-2" />
          <select value={manual.leaveType} onChange={(e) => setManual({ ...manual, leaveType: e.target.value })} className="border rounded-lg px-3 py-2">
            {["Casual", "Sick", "Paid", "Unpaid"].map((type) => <option key={type}>{type}</option>)}
          </select>
          <input required value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} placeholder="Reason" className="border rounded-lg px-3 py-2 md:col-span-2" />
        </div>
        <button disabled={savingManual} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{savingManual ? "Adding…" : "Add Manual Leave"}</button>
      </form>

      {/* TABLE */}
      <div className="bg-white shadow rounded-xl overflow-hidden">

        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <table className="w-full text-sm">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Dates</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {leaves.map((leave) => (
                <tr key={leave._id} className="border-t">

                  {/* EMPLOYEE */}
                  <td className="p-3">
                    <div className="font-semibold">
                      {leave.employeeId?.fullName}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {leave.employeeId?.email}
                    </div>
                  </td>

                  {/* DATES */}
                  <td className="p-3">
                    {new Date(leave.fromDate).toLocaleDateString()} <br />
                    <span className="text-gray-400 text-xs">
                      to {new Date(leave.toDate).toLocaleDateString()}
                    </span>
                  </td>

                  {/* TYPE */}
                  <td className="p-3">{leave.leaveType}</td>

                  {/* REASON */}
                  <td className="p-3 max-w-xs truncate">
                    {leave.reason}
                  </td>

                  {/* STATUS */}
                  <td className="p-3">
                    <StatusBadge status={leave.status} />
                  </td>

                  {/* ACTION */}
                  <td className="p-3 flex gap-2">

                    {leave.status === "Pending" && (
                      <>
                        <button
                          onClick={() =>
                            updateStatus(leave._id, "Approved")
                          }
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Approve
                        </button>

                        <button
                           onClick={() => handleReject(leave._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Reject
                        </button>
                      </>
                    )}

                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}
      </div>
    </div>
  );
}
