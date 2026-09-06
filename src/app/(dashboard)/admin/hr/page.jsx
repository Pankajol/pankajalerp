// src/app/(dashboard)/admin/hr/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const modules = [
  { key: "employees",    label: "Employees",    icon: "👥", desc: "Manage workforce",         href: "/admin/hr/employees",    color: "#6366f1" },
  { key: "attendance",   label: "Attendance",   icon: "🕐", desc: "Track punch in/out",        href: "/admin/hr/attendance",   color: "#0ea5e9" },
  { key: "leaves",       label: "Leaves",       icon: "🌿", desc: "Leave requests & balance",  href: "/admin/hr/leaves",       color: "#22c55e" },
  { key: "payroll",      label: "Payroll",      icon: "💰", desc: "Salary & payments",        href: "/admin/hr/payroll",      color: "#f59e0b" },
  { key: "performance",  label: "Performance",  icon: "📈", desc: "Reviews & ratings",         href: "/admin/hr/performance",  color: "#ec4899" },
  { key: "departments",  label: "Departments",  icon: "🏢", desc: "Org structure",             href: "/admin/hr/departments",  color: "#8b5cf6" },
  { key: "designations", label: "Designations", icon: "🎖️", desc: "Roles & levels",           href: "/admin/hr/designations", color: "#14b8a6" },
  { key: "shifts",       label: "Shifts",       icon: "⏰", desc: "Shift schedules",           href: "/admin/hr/shifts",       color: "#f97316" },
  { key: "holidays",     label: "Holidays",     icon: "🎉", desc: "Holiday calendar",          href: "/admin/hr/holidays",     color: "#ef4444" },
];

export default function HRDashboard() {
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/hr/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message || "Failed to load stats");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchStats();
  }, []);

  // ✅ Access logic – case‑insensitive and permissive for Admin/Company
  const canAccess = (mod) => {
    if (!user) return false;
    const role = user.role?.toLowerCase() || "";
    const type = user.type?.toLowerCase() || "";
    if (role === "admin" || type === "company") return true;
    // Optional: fallback to permission array
    if (user.permissions?.[mod]?.length > 0) return true;
    // For development, allow all (remove in production)
    return true;
  };

  // Safe number helper to avoid toLocaleString crash
  const safe = (val) => (val ?? 0);

  const statItems = stats ? [
    { label: "Total Employees", value: safe(stats.totalEmployees), icon: "👥" },
    { label: "Active", value: safe(stats.activeEmployees), icon: "✅" },
    { label: "Present Today", value: safe(stats.presentToday), icon: "✔️" },
    { label: "Absent Today", value: safe(stats.absentToday), icon: "❌" },
    { label: "Half Day", value: safe(stats.halfDayToday), icon: "🌗" },
    { label: "Geo‑Violation", value: safe(stats.geoViolationToday), icon: "📍" },
    { label: "On Leave", value: safe(stats.onLeaveToday), icon: "🌿" },
    { label: "Pending Leaves", value: safe(stats.pendingLeaves), icon: "⏳" },
    { label: "Payroll (Month)", value: `₹${safe(stats.monthPayroll).toLocaleString()}`, icon: "💰" },
    { label: "Paid Payroll", value: `₹${safe(stats.monthPayrollPaid).toLocaleString()}`, icon: "💳" },
    { label: "New Joiners", value: safe(stats.newJoineesThisMonth), icon: "🎉" },
  ] : [];

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.breadcrumb}>Dashboard / HR</p>
          <h1 style={styles.title}>Human Resources</h1>
          <p style={styles.subtitle}>Manage your entire workforce from one place</p>
        </div>
        <div style={styles.headerRight}>
          <button onClick={fetchStats} style={styles.refreshBtn} disabled={loading}>
            {loading ? "⏳" : "🔄"} Refresh
          </button>
          <div style={styles.badge}>
            <span style={styles.dot} />
            {stats?.activeEmployees ?? "—"} Active
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={styles.skeletonBar}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={styles.skeletonCard} />
          ))}
        </div>
      ) : error ? (
        <div style={styles.errorBar}>
          <span>⚠️ {error}</span>
          <button onClick={fetchStats} style={styles.retryBtn}>Retry</button>
        </div>
      ) : (
        <div style={styles.statsBar}>
          {statItems.map((s) => (
            <div key={s.label} style={styles.statCard}>
              <span style={styles.statIcon}>{s.icon}</span>
              <div>
                <div style={styles.statVal}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modules */}
      <div style={styles.grid}>
        {modules.map((m) => {
          const accessible = canAccess(m.key);
          return (
            <div
              key={m.key}
              style={{
                ...styles.card,
                opacity: accessible ? 1 : 0.5,
                cursor: accessible ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (accessible) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
              }}
            >
              {accessible ? (
                <Link href={m.href} style={styles.cardLink}>
                  <CardContent m={m} />
                </Link>
              ) : (
                <div style={styles.cardLocked}>
                  <CardContent m={m} />
                  <div style={styles.lockBadge}>🔒 No Access</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardContent({ m }) {
  return (
    <>
      <div style={{ ...styles.cardIcon, background: m.color + "22", color: m.color }}>
        {m.icon}
      </div>
      <div style={styles.cardLabel}>{m.label}</div>
      <div style={styles.cardDesc}>{m.desc}</div>
      <div style={{ ...styles.cardAccent, background: m.color }} />
    </>
  );
}

// ─── LIGHT THEME STYLES ────────────────────────────────────────────────
const styles = {
  page: {
    padding: "2rem",
    fontFamily: "'Inter', system-ui, sans-serif",
    background: "#f2f5f9",
    minHeight: "100vh",
    color: "#0b1a33",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  breadcrumb: {
    fontSize: "0.75rem",
    color: "#5b6d8a",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "0.3rem",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: 800,
    color: "#0b1a33",
    margin: 0,
  },
  subtitle: {
    color: "#5b6d8a",
    marginTop: "0.2rem",
    fontSize: "0.95rem",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  refreshBtn: {
    background: "#ffffff",
    border: "1px solid #d1d9e6",
    borderRadius: "10px",
    padding: "0.5rem 1.2rem",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    color: "#0b1a33",
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#ffffff",
    border: "1px solid #d1d9e6",
    borderRadius: "10px",
    padding: "0.5rem 1.2rem",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "#0b1a33",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
    display: "inline-block",
  },
  statsBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "1.2rem 1.2rem",
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #e9edf2",
    transition: "transform 0.15s",
  },
  statIcon: { fontSize: "1.6rem" },
  statVal: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "#0b1a33",
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: "0.7rem",
    color: "#5b6d8a",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
  },
  skeletonBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  skeletonCard: {
    background: "#e9edf2",
    borderRadius: "14px",
    height: 80,
    animation: "pulse 1.5s ease-in-out infinite",
  },
  errorBar: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    borderRadius: "14px",
    padding: "1rem 1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    color: "#991b1b",
  },
  retryBtn: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "0.4rem 1.2rem",
    cursor: "pointer",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "#ffffff",
    borderRadius: "18px",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #e9edf2",
    transition: "all 0.2s ease",
  },
  cardLink: {
    display: "block",
    padding: "1.5rem 1.5rem 1.2rem",
    textDecoration: "none",
    color: "inherit",
  },
  cardLocked: {
    padding: "1.5rem 1.5rem 1.2rem",
    position: "relative",
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.6rem",
    marginBottom: "1rem",
  },
  cardLabel: {
    fontWeight: 700,
    fontSize: "1.05rem",
    color: "#0b1a33",
    marginBottom: "0.2rem",
  },
  cardDesc: {
    fontSize: "0.8rem",
    color: "#5b6d8a",
  },
  cardAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  lockBadge: {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    background: "#f1f4f8",
    borderRadius: "8px",
    padding: "0.2rem 0.6rem",
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#5b6d8a",
  },
};

// Inject pulse animation for skeleton
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}


// "use client";

// import { useEffect, useState } from "react";
// import PageHeader from "@/components/hr/PageHeader";
// import StatCard from "@/components/hr/StatCard";


// export default function HrDashboardPage() {
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [stats, setStats] = useState(null);
//   const [latestEmployees, setLatestEmployees] = useState([]);
//   const [todayAttendance, setTodayAttendance] = useState([]);
//   const [activeTab, setActiveTab] = useState("attendance");

//   useEffect(() => {
//     async function loadData() {
//       try {
//         const token = localStorage.getItem("token");

//         if (!token) {
//           throw new Error("Unauthorized - No token found");
//         }

//         const [statsRes, empRes, attRes] = await Promise.all([
//           fetch("/api/hr/dashboard", {
//             headers: { Authorization: "Bearer " + token },
//           }),
//           fetch("/api/hr/employees?limit=5", {
//             headers: { Authorization: "Bearer " + token },
//           }),
//           fetch("/api/hr/attendance/today", {
//             headers: { Authorization: "Bearer " + token },
//           }),
//         ]);

//         const statsJson = await statsRes.json();
//         const empJson = await empRes.json();
//         const attJson = await attRes.json();

//         if (!statsRes.ok) throw new Error(statsJson?.msg || "Stats error");
//         if (!empRes.ok) throw new Error(empJson?.msg || "Employee error");
//         if (!attRes.ok) throw new Error(attJson?.msg || "Attendance error");

//         setStats(statsJson?.data || statsJson || null);
//         setLatestEmployees(empJson?.data || []);
//         setTodayAttendance(attJson?.data || []);
//       } catch (err) {
//         console.error(err);
//         setError(err.message || "Failed to load dashboard data");
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadData();
//   }, []);

//   /* ---------- RENDER ---------- */

//   return (
//     <div className="space-y-6">
//       <PageHeader
//         title="HR Dashboard"
//         subtitle="Quick overview of workforce, attendance & payroll."
//       />

//       {/* ERROR */}
//       {error && (
//         <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4">
//           {error}
//         </div>
//       )}

//       {/* ================= STATS ================= */}
//       <div className="grid gap-4 md:grid-cols-4">
//         {loading ? (
//           [...Array(4)].map((_, i) => (
//             <div
//               key={i}
//               className="h-28 rounded-2xl bg-slate-100 animate-pulse"
//             />
//           ))
//         ) : (
//           <>
//             <StatCard
//               label="Active Employees"
//               value={stats?.employees?.active ?? 0}
//               hint={stats?.employees?.changeText || "—"}
//             />
//             <StatCard
//               label="Present Today"
//               value={stats?.attendance?.present ?? 0}
//               hint={stats?.attendance?.presentHint || "—"}
//             />
//             <StatCard
//               label="On Leave Today"
//               value={stats?.attendance?.leave ?? 0}
//               hint={stats?.attendance?.leaveHint || "—"}
//             />
//             <StatCard
//               label="Payroll (This Month)"
//               value={`₹${stats?.payroll?.total ?? 0}`}
//               hint={stats?.payroll?.statusText || "—"}
//             />
//           </>
//         )}
//       </div>

//       {/* ================ TABS ================= */}
//       <div className="space-y-4">
//         <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
//           {["attendance", "employees", "alerts"].map((tab) => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               className={`px-3 py-1 rounded-full capitalize ${
//                 activeTab === tab
//                   ? "bg-white shadow text-slate-900"
//                   : "text-slate-500"
//               }`}
//             >
//               {tab === "attendance" && "Today’s Attendance"}
//               {tab === "employees" && "Latest Employees"}
//               {tab === "alerts" && "Alerts"}
//             </button>
//           ))}
//         </div>

//         {/* ================= ATTENDANCE ================= */}
//         {activeTab === "attendance" && (
//           <div className="rounded-2xl border bg-white overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="border-b bg-slate-50">
//                   <tr>
//                     <th className="px-4 py-3 text-left font-medium">Employee</th>
//                     <th className="px-4 py-3 text-left font-medium">Status</th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Punch In
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Punch Out
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">Hours</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {!loading && todayAttendance.length === 0 && (
//                     <tr>
//                       <td
//                         colSpan={5}
//                         className="px-4 py-6 text-center text-slate-400"
//                       >
//                         No attendance records for today.
//                       </td>
//                     </tr>
//                   )}

//                   {todayAttendance.map((row) => (
//                     <tr key={row._id} className="border-b last:border-0">
//                       <td className="px-4 py-3">
//                         {row.employeeName || "—"}
//                       </td>

//                       <td className="px-4 py-3">
//                         <span
//                           className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
//                             row.status === "Present"
//                               ? "bg-green-100 text-green-700"
//                               : row.status === "Absent"
//                               ? "bg-red-100 text-red-700"
//                               : "bg-yellow-100 text-yellow-700"
//                           }`}
//                         >
//                           {row.status || "N/A"}
//                         </span>
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {row?.punchIn?.time || "-"}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {row?.punchOut?.time || "-"}
//                       </td>

//                       <td className="px-4 py-3">
//                         {row?.totalHours ?? "0"}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {/* ================= EMPLOYEES ================= */}
//         {activeTab === "employees" && (
//           <div className="rounded-2xl border bg-white overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="border-b bg-slate-50">
//                   <tr>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Name
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Department
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Designation
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Joining Date
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {!loading && latestEmployees.length === 0 && (
//                     <tr>
//                       <td
//                         colSpan={4}
//                         className="px-4 py-6 text-center text-slate-400"
//                       >
//                         No employees found.
//                       </td>
//                     </tr>
//                   )}

//                   {latestEmployees.map((emp) => (
//                     <tr key={emp._id} className="border-b last:border-0">
//                       <td className="px-4 py-3">
//                         {emp.fullName}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {emp.departmentName || "-"}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {emp.designationTitle || "-"}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {emp.joiningDateFormatted || "-"}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}
    

//         {/* ================= ALERTS ================= */}
//         {activeTab === "alerts" && (
//           <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 text-center">
//             Configure alerts like:
//             <ul className="mt-3 space-y-1 list-disc list-inside">
//               <li>Upcoming employee joining</li>
//               <li>Probation end date</li>
//               <li>Contract expiry</li>
//               <li>Low attendance warning</li>
//             </ul>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
