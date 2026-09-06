"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";

export default function SchoolSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    schoolName: "",
    schoolAddress: "",
    schoolPhone: "",
    schoolEmail: "",
    academicYear: new Date().getFullYear().toString(),
    attendancePoints: {
      present: 2,
      halfDay: 1,
      leave: 0,
      absent: -1,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/settings", headers);
        setSettings(res.data.data || {});
      } catch (err) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttendanceChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      attendancePoints: { ...prev.attendancePoints, [name]: parseInt(value) || 0 },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.put("/school/settings", settings, headers);
      toast.success("Settings updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading settings...</div>;

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
        <FaArrowLeft /> Back
      </button>
      <h1 className="text-2xl font-bold mb-6">School Settings</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700">School Name</label>
          <input
            type="text"
            name="schoolName"
            value={settings.schoolName || ""}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Address</label>
          <input
            type="text"
            name="schoolAddress"
            value={settings.schoolAddress || ""}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700">Phone</label>
            <input
              type="text"
              name="schoolPhone"
              value={settings.schoolPhone || ""}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">Email</label>
            <input
              type="email"
              name="schoolEmail"
              value={settings.schoolEmail || ""}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Academic Year</label>
          <input
            type="text"
            name="academicYear"
            value={settings.academicYear || ""}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold text-gray-700 mb-3">Attendance Points</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["present", "halfDay", "leave", "absent"].map((key) => (
              <div key={key}>
                <label className="block text-sm font-bold text-gray-700 capitalize">{key}</label>
                <input
                  type="number"
                  name={key}
                  value={settings.attendancePoints?.[key] || 0}
                  onChange={handleAttendanceChange}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md"
          >
            <FaSave /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}