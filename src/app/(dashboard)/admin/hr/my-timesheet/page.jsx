"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";

// ─── Toast ────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${t.type === "success" ? "#22c55e55" : "#ef444455"}`,
          color: t.type === "success" ? "#166534" : "#991b1b",
          padding: "12px 20px", borderRadius: 12, fontSize: 13,
          fontFamily: "'DM Mono', monospace",
          boxShadow: `0 8px 32px ${t.type === "success" ? "#22c55e22" : "#ef444422"}`,
          animation: "ts-slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 10, minWidth: 260,
        }}>
          <span>{t.type === "success" ? "✦" : "✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "Pending",  icon: "◷" },
  Approved:  { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  label: "Approved", icon: "✓" },
  Rejected:  { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  label: "Rejected", icon: "✕" },
};

// ─── Summary Card ─────────────────────────────────────────────
function SummaryCard({ label, value, icon, color, sub, delay }) {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
      borderRadius: 16, padding: "20px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      animation: `ts-fadeUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#0b1a2a", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#7a8aa3", marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color, flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Time Entry Row ────────────────────────────────────────────
function TimeEntryRow({ entry, index, onEdit, onDelete }) {
  const status = STATUS_CONFIG[entry.status] || STATUS_CONFIG.Pending;
  const [open, setOpen] = useState(false);

  const date = new Date(entry.date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });

  return (
    <>
      <tr onClick={() => setOpen(!open)} style={{
        borderBottom: "1px solid rgba(0,0,0,0.04)",
        cursor: "pointer",
        transition: "background 0.15s",
        background: open ? "rgba(0,0,0,0.02)" : "transparent",
        animation: `ts-fadeUp 0.4s ease ${index * 0.04}s both`,
      }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
        onMouseLeave={e => e.currentTarget.style.background = open ? "rgba(0,0,0,0.02)" : "transparent"}
      >
        <td style={{ padding: "14px 16px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#0b1a2a" }}>{date}</div>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: "#0b1a2a" }}>{entry.project || "—"}</div>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <div style={{ fontSize: 13, color: "#2c3e50" }}>{entry.task || "—"}</div>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600, color: "#0b1a2a" }}>
            {entry.hours}h
          </span>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <span style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}33`,
            fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "3px 10px", borderRadius: 20,
            display: "inline-flex", alignItems: "center", gap: 5 }}>
            {status.icon} {entry.status || "Pending"}
          </span>
        </td>
        <td style={{ padding: "14px 16px", color: "#7a8aa3", fontSize: 12 }}>
          {open ? "▲" : "▼"}
        </td>
      </tr>
      {open && (
        <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <td colSpan={6} style={{ padding: "12px 20px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 1.5 }}>Description</div>
                <div style={{ fontSize: 14, color: "#2c3e50", marginTop: 3 }}>{entry.description || "—"}</div>
              </div>
              {entry.status === "Pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                    style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer" }}>
                    Edit entry
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(entry._id); }}
                    style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              )}
              {entry.status === "Rejected" && entry.rejectionReason && <div style={{ fontSize: 13, color: "#b91c1c" }}>Review note: {entry.rejectionReason}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Add Time Entry Drawer ────────────────────────────────────
function AddEntryDrawer({ open, onClose, onSuccess, entry, onSaved }) {
  const [form, setForm] = useState({ date: "", project: "", task: "", hours: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(entry ? {
      date: entry.date ? new Date(entry.date).toISOString().slice(0, 10) : "",
      project: entry.project || "", task: entry.task || "", hours: entry.hours ?? "", description: entry.description || "",
    } : { date: new Date().toISOString().slice(0, 10), project: "", task: "", hours: "", description: "" });
  }, [entry, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (entry) await axios.put(`/api/hr/my-timesheet/${entry._id}`, form, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post("/api/hr/my-timesheet", form, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess(entry ? "Time entry updated successfully" : "Time entry added successfully");
      onSaved();
      onClose();
    } catch (err) {
      onSuccess(err?.response?.data?.message || "Failed to add entry", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
        zIndex: 100, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "opacity 0.3s ease",
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px, 95vw)",
        background: "#ffffff", borderLeft: "1px solid rgba(0,0,0,0.08)",
        zIndex: 101, padding: "32px 28px", overflowY: "auto",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 2 }}>New Entry</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#0b1a2a", margin: "4px 0 0" }}>{entry ? "Edit Time Entry" : "Add Time Entry"}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#7a8aa3", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Date */}
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Date</label>
            <input type="date" required value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#f8faff", border: "1px solid rgba(0,0,0,0.1)", color: "#0b1a2a", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }}
            />
          </div>

          {/* Project */}
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Project</label>
            <input type="text" required placeholder="e.g. Client Portal"
              value={form.project}
              onChange={e => setForm(p => ({ ...p, project: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#f8faff", border: "1px solid rgba(0,0,0,0.1)", color: "#0b1a2a", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }}
            />
          </div>

          {/* Task */}
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Task / Activity</label>
            <input type="text" required placeholder="e.g. API Integration"
              value={form.task}
              onChange={e => setForm(p => ({ ...p, task: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#f8faff", border: "1px solid rgba(0,0,0,0.1)", color: "#0b1a2a", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }}
            />
          </div>

          {/* Hours */}
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Hours</label>
            <input type="number" required min="0.5" max="24" step="0.5" placeholder="e.g. 4.5"
              value={form.hours}
              onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#f8faff", border: "1px solid rgba(0,0,0,0.1)", color: "#0b1a2a", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Description</label>
            <textarea rows={3} placeholder="Brief description of work done..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#f8faff", border: "1px solid rgba(0,0,0,0.1)", color: "#0b1a2a", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none", resize: "vertical" }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            padding: "14px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading ? (
              <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "ts-spin 0.7s linear infinite" }} />
            ) : entry ? "Save Changes" : "⏱ Add Entry"}
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function TimeSheetPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [stats, setStats] = useState({ totalHours: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const toastId = useRef(0);

  const addToast = (message, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/hr/my-timesheet", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const data = res.data.data || [];
        setEntries(data);
        // Calculate stats
        const total = data.reduce((sum, e) => sum + (e.hours || 0), 0);
        const pending = data.filter(e => e.status === "Pending").length;
        const approved = data.filter(e => e.status === "Approved").length;
        const rejected = data.filter(e => e.status === "Rejected").length;
        setStats({ totalHours: total, pendingCount: pending, approvedCount: approved, rejectedCount: rejected });
      }
    } catch (err) {
      console.error("Error fetching timesheet", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this pending time entry?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/hr/my-timesheet/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast("Time entry deleted");
      fetchEntries();
    } catch (err) {
      addToast(err?.response?.data?.message || "Failed to delete entry", "error");
    }
  };

  const openNewEntry = () => { setEditingEntry(null); setShowDrawer(true); };
  const openEditEntry = (entry) => { setEditingEntry(entry); setShowDrawer(true); };

  const filters = ["All", "Pending", "Approved", "Rejected"];
  const filtered = filter === "All" ? entries : entries.filter(e => e.status === filter);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes ts-slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ts-fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ts-spin    { to { transform:rotate(360deg); } }
        @keyframes ts-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .ts-page * { box-sizing:border-box; }
        .ts-page { min-height:100vh; background:#f2f6fc; font-family:'Syne',sans-serif; color:#0b1a2a; padding:32px 20px 60px; }
        .ts-skeleton { background:linear-gradient(90deg,#dce3ed 25%,#eef4fa 50%,#dce3ed 75%); background-size:400px 100%; animation:ts-shimmer 1.4s infinite; border-radius:8px; }
        .ts-filter-btn { padding:6px 16px; border-radius:20px; border:1px solid rgba(0,0,0,0.08); background:transparent; color:#5e6f8d; font-family:'DM Mono',monospace; font-size:12px; cursor:pointer; transition:all 0.2s; }
        .ts-filter-btn:hover { border-color:rgba(0,0,0,0.2); color:#2c3e50; }
        .ts-filter-btn.active { background:rgba(56,189,248,0.1); border-color:#38bdf855; color:#38bdf8; }
        table { border-collapse:collapse; width:100%; }
      `}</style>

      <Toast toasts={toasts} />
      <AddEntryDrawer open={showDrawer} entry={editingEntry} onClose={() => setShowDrawer(false)} onSuccess={addToast} onSaved={fetchEntries} />

      <div className="ts-page">
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, animation: "ts-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>HR Portal</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0b1a2a", margin: 0 }}>My Timesheet</h1>
              <p style={{ margin: "6px 0 0", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#5e6f8d" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <button onClick={openNewEntry} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              border: "none", color: "#fff", padding: "12px 20px", borderRadius: 12,
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <span style={{ fontSize: 18 }}>+</span> Add Entry
            </button>
          </div>

          {/* ── Summary Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
            {loading ? [0,1,2,3].map(i => (
              <div key={i} className="ts-skeleton" style={{ height: 100 }} />
            )) : (
              <>
                <SummaryCard label="Total Hours" value={`${stats.totalHours}h`} icon="⏱" color="#3b82f6" sub="This month" delay={0.05} />
                <SummaryCard label="Pending" value={stats.pendingCount} icon="◷" color="#f59e0b" sub="Awaiting approval" delay={0.1} />
                <SummaryCard label="Approved" value={stats.approvedCount} icon="✓" color="#22c55e" sub="Confirmed" delay={0.15} />
                <SummaryCard label="Rejected" value={stats.rejectedCount} icon="✕" color="#ef4444" sub="Needs correction" delay={0.2} />
              </>
            )}
          </div>

          {/* ── Entries Table ── */}
          <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)", animation: "ts-fadeUp 0.5s ease 0.25s both" }}>

            {/* Table header */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#0b1a2a", margin: 0 }}>Time Entries</h2>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5e6f8d", marginTop: 3 }}>
                  {filtered.length} entry{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {filters.map(f => (
                  <button key={f} className={`ts-filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3,4].map(i => <div key={i} className="ts-skeleton" style={{ height: 52 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⏱</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#5e6f8d" }}>
                  No {filter !== "All" ? filter.toLowerCase() : ""} time entries found
                </div>
                <button onClick={openNewEntry} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  + Add your first entry
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      {["Date", "Project", "Task", "Hours", "Status", ""].map((h, i) => (
                        <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#5e6f8d", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry, i) => (
                      <TimeEntryRow key={entry._id || i} entry={entry} index={i} onEdit={openEditEntry} onDelete={handleDelete} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
