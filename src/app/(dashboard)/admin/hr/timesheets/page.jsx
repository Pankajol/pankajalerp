"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function TimesheetApprovalsPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Pending");
  const [message, setMessage] = useState("");

  const loadEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`/api/hr/timesheets?status=${status}`, { headers: { Authorization: `Bearer ${token}` } });
      setEntries(data.data || []);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Unable to load team timesheets");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadEntries(); }, [status]);

  const review = async (id, nextStatus) => {
    const rejectionReason = nextStatus === "Rejected" ? window.prompt("Reason for rejection (shown to the employee):") : "";
    if (nextStatus === "Rejected" && !rejectionReason?.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/hr/timesheets/${id}`, { status: nextStatus, rejectionReason }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(`Entry ${nextStatus.toLowerCase()}.`);
      loadEntries();
    } catch (error) { setMessage(error?.response?.data?.message || "Unable to review entry"); }
  };

  return <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px", color: "#0b1a2a" }}>
    <p style={{ color: "#64748b", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>HR Portal</p>
    <h1 style={{ margin: "0 0 8px" }}>Timesheet approvals</h1>
    <p style={{ color: "#64748b" }}>Review employee time entries. Rejections require a note.</p>
    {message && <div style={{ margin: "16px 0", padding: 12, borderRadius: 8, background: "#eff6ff", color: "#1d4ed8" }}>{message}</div>}
    <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>{["Pending", "Approved", "Rejected"].map(value => <button key={value} onClick={() => setStatus(value)} style={{ border: 0, borderRadius: 20, padding: "8px 14px", cursor: "pointer", background: status === value ? "#2563eb" : "#e2e8f0", color: status === value ? "white" : "#334155" }}>{value}</button>)}</div>
    <div style={{ overflowX: "auto", background: "white", border: "1px solid #e2e8f0", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr style={{ background: "#f8fafc", textAlign: "left" }}>{["Employee", "Date", "Project / task", "Hours", "Description", "Action"].map(h => <th key={h} style={{ padding: 14, fontSize: 12 }}>{h}</th>)}</tr></thead>
      <tbody>{loading ? <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }}>Loading…</td></tr> : entries.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }}>No {status.toLowerCase()} entries.</td></tr> : entries.map(entry => <tr key={entry._id} style={{ borderTop: "1px solid #e2e8f0" }}><td style={{ padding: 14 }}>{entry.employeeId?.fullName || "Employee"}<br /><small>{entry.employeeId?.employeeCode}</small></td><td style={{ padding: 14 }}>{new Date(entry.date).toLocaleDateString("en-IN")}</td><td style={{ padding: 14 }}>{entry.project}<br /><small>{entry.task}</small></td><td style={{ padding: 14 }}>{entry.hours}h</td><td style={{ padding: 14, maxWidth: 240 }}>{entry.description || "—"}</td><td style={{ padding: 14 }}>{entry.status === "Pending" ? <div style={{ display: "flex", gap: 8 }}><button onClick={() => review(entry._id, "Approved")} style={{ border: 0, borderRadius: 6, padding: "7px 10px", background: "#16a34a", color: "white", cursor: "pointer" }}>Approve</button><button onClick={() => review(entry._id, "Rejected")} style={{ border: 0, borderRadius: 6, padding: "7px 10px", background: "#dc2626", color: "white", cursor: "pointer" }}>Reject</button></div> : entry.status}</td></tr>)}</tbody></table>
    </div>
  </main>;
}
