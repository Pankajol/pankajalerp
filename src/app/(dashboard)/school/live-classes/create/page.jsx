"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Select from "react-select";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

export default function CreateLiveClass() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    class: "",
    subject: "",
    teacher: "",
    date: "",
    startTime: "",
    endTime: "",
    meetingLink: "",
    platform: "zoom",
    recordingLink: "",
    isActive: true,
  });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/staff", { params: { limit: 1000 }, ...headers });
        setStaff(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStaff();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post("/school/live-classes", formData, headers);
      toast.success("Live class scheduled");
      router.push("/school/live-classes");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setSaving(false);
    }
  };

  const staffOptions = staff.map((s) => ({ value: s._id, label: `${s.firstName} ${s.lastName}` }));
  const classOptions = ["1","2","3","4","5","6","7","8","9","10","11","12"].map((c) => ({ value: c, label: `Class ${c}` }));
  const platformOptions = [
    { value: "zoom", label: "Zoom" },
    { value: "google-meet", label: "Google Meet" },
    { value: "microsoft-teams", label: "Microsoft Teams" },
    { value: "other", label: "Other" },
  ];

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
        <FaArrowLeft /> Back
      </button>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="2"
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700">Class *</label>
            <Select
              options={classOptions}
              value={classOptions.find((o) => o.value === formData.class)}
              onChange={(opt) => setFormData((prev) => ({ ...prev, class: opt?.value || "" }))}
              placeholder="Select class"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">Subject *</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700">Teacher</label>
            <Select
              options={staffOptions}
              value={staffOptions.find((o) => o.value === formData.teacher)}
              onChange={(opt) => setFormData((prev) => ({ ...prev, teacher: opt?.value || "" }))}
              placeholder="Assign teacher"
              isClearable
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700">Start Time *</label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">End Time *</label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700">Platform</label>
            <Select
              options={platformOptions}
              value={platformOptions.find((o) => o.value === formData.platform)}
              onChange={(opt) => setFormData((prev) => ({ ...prev, platform: opt?.value || "zoom" }))}
              placeholder="Select platform"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">Meeting Link</label>
            <input
              type="url"
              name="meetingLink"
              value={formData.meetingLink}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="https://..."
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700">Recording Link</label>
          <input
            type="url"
            name="recordingLink"
            value={formData.recordingLink}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="https://..."
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600"
            />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md">
            <FaSave /> {saving ? "Saving..." : "Schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}