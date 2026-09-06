"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaGraduationCap,
  FaBriefcase,
  FaHome,
  FaEdit,
  FaFileAlt,
  FaUsers,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StaffProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/staff/${id}`, headers);
        setStaff(res.data.data);
      } catch (err) {
        toast.error("Failed to load staff profile");
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return <div className="text-center text-gray-400 py-12">Staff member not found</div>;
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: FaUser },
    { id: "experience", label: "Experience", icon: FaBriefcase },
    { id: "documents", label: "Documents", icon: FaFileAlt },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-5xl mx-auto">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <FaArrowLeft /> Back to Staff
        </motion.button>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8"
        >
          <div className="h-48 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 relative">
            <div className="absolute -bottom-12 left-8 flex items-end gap-6">
              <div className="w-28 h-28 bg-white rounded-3xl p-1 shadow-xl">
                <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-6xl font-bold">
                  {staff.firstName[0]}{staff.lastName?.[0] || ""}
                </div>
              </div>

              <div className="mb-4">
                <h1 className="text-4xl font-bold text-white">
                  {staff.firstName} {staff.lastName}
                </h1>
                <p className="text-violet-100 text-lg">ID: {staff.staffId}</p>
                <p className="text-violet-100">{staff.designation} {staff.department && `· ${staff.department}`}</p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/school/staff/${id}/edit`)}
              className="absolute top-6 right-6 flex items-center gap-2 px-6 py-3 bg-white text-gray-800 rounded-2xl hover:bg-gray-100 transition-all shadow-lg font-medium"
            >
              <FaEdit /> Edit Profile
            </button>
          </div>

          {/* Status */}
          <div className="pt-16 pb-6 px-8">
            <span className={`inline-flex px-4 py-1.5 text-sm font-medium rounded-2xl ${staff.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {staff.isActive ? "● Active Staff" : "Inactive"}
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-1 mb-8">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-6 rounded-3xl font-medium flex items-center justify-center gap-3 transition-all ${
                    activeTab === tab.id
                      ? "bg-violet-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
          >
            {activeTab === "profile" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-3xl border border-gray-100">
                  <h3 className="font-bold text-gray-700 flex items-center gap-3 mb-5">
                    <FaUser className="text-violet-600" /> Personal Information
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div><span className="text-gray-500">Email</span><p className="font-medium">{staff.email}</p></div>
                    <div><span className="text-gray-500">Phone</span><p className="font-medium">{staff.phone || "—"}</p></div>
                    <div><span className="text-gray-500">Gender</span><p className="font-medium capitalize">{staff.gender}</p></div>
                    <div><span className="text-gray-500">Date of Birth</span><p className="font-medium">{staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString('en-IN') : "—"}</p></div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-3xl border border-gray-100">
                  <h3 className="font-bold text-gray-700 flex items-center gap-3 mb-5">
                    <FaGraduationCap className="text-emerald-600" /> Professional Details
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div><span className="text-gray-500">Designation</span><p className="font-medium">{staff.designation}</p></div>
                    <div><span className="text-gray-500">Department</span><p className="font-medium">{staff.department || "—"}</p></div>
                    <div><span className="text-gray-500">Joining Date</span><p className="font-medium">{staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN') : "—"}</p></div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-3xl border border-gray-100">
                  <h3 className="font-bold text-gray-700 flex items-center gap-3 mb-5">
                    <FaHome className="text-amber-600" /> Emergency Contact
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div><span className="text-gray-500">Name</span><p className="font-medium">{staff.emergencyContact?.name || "—"}</p></div>
                    <div><span className="text-gray-500">Phone</span><p className="font-medium">{staff.emergencyContact?.phone || "—"}</p></div>
                    <div><span className="text-gray-500">Relation</span><p className="font-medium">{staff.emergencyContact?.relation || "—"}</p></div>
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === "experience" && (
              <div className="space-y-10">
                {staff.qualifications?.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-5 flex items-center gap-3">
                      <FaGraduationCap className="text-violet-600" /> Qualifications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {staff.qualifications.map((q, idx) => (
                        <motion.div key={idx} whileHover={{ scale: 1.02 }} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="font-semibold">{q.degree}</p>
                          <p className="text-gray-600">{q.institution}</p>
                          {q.year && <p className="text-sm text-gray-500 mt-2">Year: {q.year}</p>}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {staff.workExperience?.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-5 flex items-center gap-3">
                      <FaBriefcase className="text-violet-600" /> Work Experience
                    </h3>
                    <div className="space-y-4">
                      {staff.workExperience.map((exp, idx) => (
                        <motion.div key={idx} whileHover={{ scale: 1.01 }} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="font-semibold text-lg">{exp.role}</p>
                          <p className="text-gray-700">{exp.company}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {exp.from ? new Date(exp.from).toLocaleDateString() : ""} — {exp.to ? new Date(exp.to).toLocaleDateString() : "Present"}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <FaFileAlt className="text-violet-600" /> Documents
                </h3>
                {staff.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {staff.documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-5 border border-gray-200 rounded-2xl hover:border-violet-300 hover:shadow transition-all group"
                      >
                        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                          📄
                        </div>
                        <div className="flex-1">
                          <p className="font-medium group-hover:text-violet-600">{doc.name}</p>
                          <p className="text-xs text-gray-500">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400">
                    <FaFileAlt className="text-6xl mx-auto mb-4 text-gray-200" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}