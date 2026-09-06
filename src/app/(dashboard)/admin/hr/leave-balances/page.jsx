"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PageHeader from "@/components/hr/PageHeader";

const fields = ["casual", "sick", "paid", "unpaid"];

export default function LeaveBalancesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/hr/leave-balances", { headers: headers() });
      if (!data.success) throw new Error(data.message);
      setRows(data.data.map(({ employee, balance }) => ({ employee, ...balance })));
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || "Could not load leave balances");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const change = (id, field, value) => setRows((current) => current.map((row) =>
    String(row.employee._id) === String(id) ? { ...row, [field]: value } : row
  ));
  const save = async (row) => {
    try {
      setSaving(String(row.employee._id));
      setMessage("");
      await axios.put(`/api/hr/leave-balance/${row.employee._id}`, Object.fromEntries(fields.map((field) => [field, Number(row[field])])), { headers: headers() });
      setMessage(`${row.employee.fullName}'s leave allocation was saved.`);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save leave allocation");
    } finally {
      setSaving("");
    }
  };
  const visible = rows.filter((row) => `${row.employee.fullName} ${row.employee.email} ${row.employee.employeeCode || ""}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Manual Employee Leave Allocation" subtitle="Manually define and update Casual, Sick, Paid, and Unpaid leave for every employee." />
      <div className="rounded-2xl border bg-white p-4 flex flex-wrap gap-3 items-center justify-between">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="border rounded-lg px-3 py-2 w-full sm:w-72" />
        <span className="text-sm text-slate-500">{visible.length} employee{visible.length === 1 ? "" : "s"}</span>
      </div>
      {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}
      <div className="rounded-2xl border bg-white overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 border-b"><tr>
            <th className="px-4 py-3 text-left">Employee</th>
            {fields.map((field) => <th key={field} className="px-3 py-3 text-center capitalize">{field}</th>)}
            <th className="px-4 py-3 text-right">Action</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading employees…</td></tr> : visible.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-slate-500">No employees found.</td></tr> : visible.map((row) => <tr key={row.employee._id} className="border-b last:border-0">
            <td className="px-4 py-3"><div className="font-medium">{row.employee.fullName}</div><div className="text-xs text-slate-500">{row.employee.employeeCode || row.employee.email}</div></td>
            {fields.map((field) => <td key={field} className="px-3 py-3"><input type="number" min="0" step="1" value={row[field] ?? 0} onChange={(e) => change(row.employee._id, field, e.target.value)} className="w-20 border rounded-md px-2 py-1.5 text-center" /></td>)}
            <td className="px-4 py-3 text-right"><button disabled={saving === String(row.employee._id)} onClick={() => save(row)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50">{saving === String(row.employee._id) ? "Saving…" : "Save"}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
