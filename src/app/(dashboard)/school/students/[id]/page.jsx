"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaUser,
  FaGraduationCap,
  FaUsers,
  FaFileAlt,
  FaEdit,
  FaCalendarAlt,
  FaPhone,
  FaEnvelope,
  FaHome,
  FaBirthdayCake,
  FaMapPin,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StudentProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/students/${id}`, headers);
        setStudent(res.data.data);
      } catch (err) {
        toast.error("Failed to load student profile");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return <div className="p-6 text-center text-gray-400">Student not found</div>;
  }

  const tabs = [
    { id: "personal", label: "Personal", icon: FaUser },
    { id: "academic", label: "Academic", icon: FaGraduationCap },
    { id: "family", label: "Family", icon: FaUsers },
    { id: "documents", label: "Documents", icon: FaFileAlt },
  ];

  // Helper to format address from houseInfo
  const formatHouseAddress = (info) => {
    if (!info) return null;
    const parts = [];
    if (info.line1) parts.push(info.line1);
    if (info.line2) parts.push(info.line2);
    if (info.city) parts.push(info.city);
    if (info.state) parts.push(info.state);
    if (info.country) parts.push(info.country);
    if (info.pin) parts.push(`PIN: ${info.pin}`);
    return parts.join(", ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <FaArrowLeft /> Back to Students
        </motion.button>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8"
        >
          <div className="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 relative">
            <div className="absolute -bottom-12 left-8 flex items-end gap-6">
              <div className="w-28 h-28 bg-white rounded-3xl p-1 shadow-xl">
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-6xl font-bold shadow-inner">
                  {student.firstName[0]}{student.lastName?.[0] || ""}
                </div>
              </div>

              <div className="mb-4">
                <h1 className="text-4xl font-bold text-white drop-shadow-md">
                  {student.firstName} {student.lastName}
                </h1>
                <p className="text-indigo-100 text-lg">ID: {student.studentId}</p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/school/students/${id}/edit`)}
              className="absolute top-6 right-6 flex items-center gap-2 px-6 py-3 bg-white text-gray-800 rounded-2xl hover:bg-gray-100 transition-all shadow-lg font-medium"
            >
              <FaEdit /> Edit Profile
            </button>
          </div>

          {/* Status Badges */}
          <div className="pt-16 pb-6 px-8 flex flex-wrap gap-3">
            <span className={`px-4 py-1.5 text-sm font-medium rounded-2xl ${student.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {student.isActive ? "● Active" : "Inactive"}
            </span>
            {student.isScholar && (
              <span className="px-4 py-1.5 text-sm font-medium rounded-2xl bg-amber-100 text-amber-700">🏆 Scholar Student</span>
            )}
            {student.house && (
              <span
                className="px-4 py-1.5 text-sm font-medium rounded-2xl"
                style={{ backgroundColor: (student.house.color || "#8b5cf6") + "15", color: student.house.color || "#8b5cf6" }}
              >
                🏠 {student.house.name}
              </span>
            )}
            {student.houseInfo && student.houseInfo.name && (
              <span className="px-4 py-1.5 text-sm font-medium rounded-2xl bg-indigo-100 text-indigo-700">
                🏠 {student.houseInfo.name}
              </span>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8 bg-white rounded-3xl p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-3xl font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
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
            {activeTab === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                      <FaBirthdayCake size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-semibold">
                        {student.dateOfBirth
                          ? new Date(student.dateOfBirth).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                      <FaUser size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-semibold capitalize">{student.gender || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                      <FaEnvelope size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-semibold">{student.email || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                      <FaPhone size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-semibold">{student.phone || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-4 border-t">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mt-1">
                      <FaHome size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Student's Address</p>
                      <p className="font-medium leading-relaxed">{student.address || "No address provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "academic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                    <FaGraduationCap className="text-indigo-600" /> Academic Details
                  </h3>
                  <div className="space-y-4">
                    <p>
                      <span className="font-medium text-gray-500">Class:</span> {student.class || "—"}
                      {student.section && ` - ${student.section}`}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500">Roll Number:</span> {student.rollNumber || "—"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500">House (legacy):</span> {student.house?.name || "—"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500">Scholar:</span> {student.isScholar ? "✅ Yes" : "❌ No"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-500">Admission Date:</span>{" "}
                      {student.admissionDate
                        ? new Date(student.admissionDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* House Info (new) */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                    <FaHome className="text-indigo-600" /> House Address
                  </h3>
                  {student.houseInfo && (student.houseInfo.name || student.houseInfo.line1) ? (
                    <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
                      {student.houseInfo.name && (
                        <p>
                          <span className="font-medium text-gray-500">Name:</span>{" "}
                          <span className="font-semibold">{student.houseInfo.name}</span>
                        </p>
                      )}
                      {student.houseInfo.line1 && (
                        <p>
                          <span className="font-medium text-gray-500">Line 1:</span> {student.houseInfo.line1}
                        </p>
                      )}
                      {student.houseInfo.line2 && (
                        <p>
                          <span className="font-medium text-gray-500">Line 2:</span> {student.houseInfo.line2}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {student.houseInfo.city && (
                          <p>
                            <span className="font-medium text-gray-500">City:</span> {student.houseInfo.city}
                          </p>
                        )}
                        {student.houseInfo.state && (
                          <p>
                            <span className="font-medium text-gray-500">State:</span> {student.houseInfo.state}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {student.houseInfo.country && (
                          <p>
                            <span className="font-medium text-gray-500">Country:</span> {student.houseInfo.country}
                          </p>
                        )}
                        {student.houseInfo.pin && (
                          <p>
                            <span className="font-medium text-gray-500">PIN:</span> {student.houseInfo.pin}
                          </p>
                        )}
                      </div>
                      {formatHouseAddress(student.houseInfo) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-500">Full address:</p>
                          <p className="font-medium text-gray-800">{formatHouseAddress(student.houseInfo)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No house address added</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "family" && (
              <div>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <FaUsers className="text-indigo-600" /> Family Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <p className="uppercase text-xs tracking-widest text-gray-500 mb-3">PARENT / GUARDIAN</p>
                    {student.parent ? (
                      <>
                        <p className="font-semibold text-xl">{student.parent.name || "—"}</p>
                        <p className="text-gray-600 mt-1">
                          <span className="font-medium">Relation:</span> {student.parent.relation || "—"}
                        </p>
                        <p className="text-gray-600">{student.parent.phone || "—"}</p>
                        <p className="text-gray-600">{student.parent.email || "—"}</p>
                      </>
                    ) : (
                      <p className="text-gray-400 italic">No parent information available</p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <p className="uppercase text-xs tracking-widest text-gray-500 mb-3">SIBLINGS</p>
                    {student.siblings?.length > 0 ? (
                      <div className="space-y-3">
                        {student.siblings.map((sib) => (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            key={sib._id}
                            onClick={() => router.push(`/school/students/${sib._id}`)}
                            className="w-full text-left p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all group"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{sib.firstName} {sib.lastName}</p>
                                <p className="text-sm text-gray-500">{sib.studentId}</p>
                              </div>
                              <span className="text-xs bg-gray-100 px-3 py-1 rounded-full group-hover:bg-indigo-100 transition-colors">
                                {sib.class}{sib.section ? `-${sib.section}` : ""}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">No siblings linked</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <FaFileAlt className="text-indigo-600" /> Documents
                </h3>
                {student.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-5 border border-gray-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all group flex items-start gap-4"
                      >
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          📄
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-indigo-600 transition-colors">{doc.name || "Document"}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded on {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "unknown date"}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    No documents uploaded yet.
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