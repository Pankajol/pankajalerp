"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { FaArrowLeft, FaSave, FaPlus, FaTrash, FaUserTie, FaGraduationCap, FaBriefcase, FaPhone } from "react-icons/fa";
import { toast } from "react-toastify";

export default function EditStaff() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    staffId: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    gender: "male",
    dateOfBirth: "",
    joiningDate: "",
    designation: "",
    department: "",
    qualifications: [],
    workExperience: [],
    address: "",
    emergencyContact: { name: "", phone: "", relation: "" },
    isActive: true,
  });

  const steps = [
    { title: "Basic Info", icon: FaUserTie },
    { title: "Qualifications", icon: FaGraduationCap },
    { title: "Experience", icon: FaBriefcase },
    { title: "Contact", icon: FaPhone },
  ];

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/staff/${id}`, headers);
        const data = res.data.data;
        setFormData({
          staffId: data.staffId || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          password: "",
          phone: data.phone || "",
          gender: data.gender || "male",
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
          joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString().split("T")[0] : "",
          designation: data.designation || "",
          department: data.department || "",
          qualifications: data.qualifications || [],
          workExperience: data.workExperience || [],
          address: data.address || "",
          emergencyContact: data.emergencyContact || { name: "", phone: "", relation: "" },
          isActive: data.isActive !== undefined ? data.isActive : true,
        });
      } catch (err) {
        toast.error("Failed to load staff data");
        router.push("/school/staff");
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [id, router]);

  // ─── Handlers (same as Create) ──────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleEmergencyChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [name]: value },
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const addQualification = () => {
    setFormData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, { degree: "", institution: "", year: "" }],
    }));
  };
  const removeQualification = (idx) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== idx),
    }));
  };
  const handleQualificationChange = (idx, field, value) => {
    const updated = [...formData.qualifications];
    updated[idx][field] = value;
    setFormData(prev => ({ ...prev, qualifications: updated }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      workExperience: [...prev.workExperience, { company: "", role: "", from: "", to: "" }],
    }));
  };
  const removeExperience = (idx) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== idx),
    }));
  };
  const handleExperienceChange = (idx, field, value) => {
    const updated = [...formData.workExperience];
    updated[idx][field] = value;
    setFormData(prev => ({ ...prev, workExperience: updated }));
  };

  const validateStep = () => {
    const newErrors = {};
    if (currentStep === 0) {
      if (!formData.staffId.trim()) newErrors.staffId = "Staff ID required";
      if (!formData.firstName.trim()) newErrors.firstName = "First name required";
      if (!formData.email.trim()) newErrors.email = "Email required";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email";
      if (!formData.designation.trim()) newErrors.designation = "Designation required";
      if (formData.phone && !/^[0-9+\-\s()]{10,15}$/.test(formData.phone)) {
        newErrors.phone = "Invalid phone number";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
    } else {
      toast.error("Please fix all errors before proceeding");
    }
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) {
      toast.error("Please fix all errors");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.put(`/school/staff/${id}`, formData, headers);
      toast.success("✅ Staff updated successfully!");
      setTimeout(() => router.push(`/school/staff/${id}`), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all active:scale-95">
            <FaArrowLeft size={22} className="text-gray-600" />
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Edit Staff Member
          </h1>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between mb-3 px-1">
            {steps.map((step, i) => (
              <div key={i} className={`flex flex-col items-center ${i <= currentStep ? "text-violet-600" : "text-gray-400"}`}>
                <motion.div whileHover={{ scale: 1.1 }} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${i <= currentStep ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-gray-200"}`}>
                  <step.icon size={24} />
                </motion.div>
                <div className="text-xs mt-2 font-medium">{step.title}</div>
              </div>
            ))}
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600" animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="relative">
            <AnimatePresence mode="wait">
              {/* Step 0: Basic Info */}
              {currentStep === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Staff ID</label>
                      <input type="text" value={formData.staffId} className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded-2xl px-5 py-3 cursor-not-allowed" disabled />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">First Name <span className="text-red-500">*</span></label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full border ${errors.firstName ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`} required />
                      {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Last Name</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full border ${errors.email ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`} required />
                      {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Reset Login Password</label>
                      <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" placeholder="Leave blank to keep current" minLength={6} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Phone</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={`w-full border ${errors.phone ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`} />
                      {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none bg-white">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Date of Birth</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Joining Date</label>
                      <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Designation <span className="text-red-500">*</span></label>
                      <input type="text" name="designation" value={formData.designation} onChange={handleChange} className={`w-full border ${errors.designation ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`} required />
                      {errors.designation && <p className="text-xs text-red-500">{errors.designation}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Department</label>
                      <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Qualifications */}
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold">Qualifications</h3>
                    <button type="button" onClick={addQualification} className="flex items-center gap-2 bg-violet-100 text-violet-700 px-5 py-2 rounded-2xl hover:bg-violet-200 transition-all">
                      <FaPlus /> Add Qualification
                    </button>
                  </div>
                  {formData.qualifications.map((q, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 rounded-2xl mb-4 flex flex-wrap gap-3 items-end">
                      <input placeholder="Degree" value={q.degree} onChange={(e) => handleQualificationChange(idx, "degree", e.target.value)} className="flex-1 min-w-[120px] border rounded-xl px-4 py-3" />
                      <input placeholder="Institution" value={q.institution} onChange={(e) => handleQualificationChange(idx, "institution", e.target.value)} className="flex-1 min-w-[120px] border rounded-xl px-4 py-3" />
                      <input placeholder="Year" type="number" value={q.year} onChange={(e) => handleQualificationChange(idx, "year", e.target.value)} className="w-24 border rounded-xl px-4 py-3" />
                      <button type="button" onClick={() => removeQualification(idx)} className="text-red-500 hover:text-red-700 p-3"><FaTrash /></button>
                    </div>
                  ))}
                  {formData.qualifications.length === 0 && <p className="text-gray-400 italic text-center py-8">No qualifications added yet.</p>}
                </motion.div>
              )}

              {/* Step 2: Experience */}
              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold">Work Experience</h3>
                    <button type="button" onClick={addExperience} className="flex items-center gap-2 bg-violet-100 text-violet-700 px-5 py-2 rounded-2xl hover:bg-violet-200 transition-all">
                      <FaPlus /> Add Experience
                    </button>
                  </div>
                  {formData.workExperience.map((exp, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 rounded-2xl mb-4 flex flex-wrap gap-3 items-end">
                      <input placeholder="Company" value={exp.company} onChange={(e) => handleExperienceChange(idx, "company", e.target.value)} className="flex-1 min-w-[120px] border rounded-xl px-4 py-3" />
                      <input placeholder="Role" value={exp.role} onChange={(e) => handleExperienceChange(idx, "role", e.target.value)} className="flex-1 min-w-[120px] border rounded-xl px-4 py-3" />
                      <input placeholder="From" type="date" value={exp.from} onChange={(e) => handleExperienceChange(idx, "from", e.target.value)} className="w-40 border rounded-xl px-4 py-3" />
                      <input placeholder="To" type="date" value={exp.to} onChange={(e) => handleExperienceChange(idx, "to", e.target.value)} className="w-40 border rounded-xl px-4 py-3" />
                      <button type="button" onClick={() => removeExperience(idx)} className="text-red-500 hover:text-red-700 p-3"><FaTrash /></button>
                    </div>
                  ))}
                  {formData.workExperience.length === 0 && <p className="text-gray-400 italic text-center py-8">No work experience added yet.</p>}
                </motion.div>
              )}

              {/* Step 3: Contact */}
              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Residential Address</label>
                      <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-lg font-semibold text-gray-700 mb-4">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="block text-sm font-semibold text-gray-700">Name</label>
                          <input type="text" name="name" value={formData.emergencyContact.name} onChange={handleEmergencyChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-semibold text-gray-700">Phone</label>
                          <input type="text" name="phone" value={formData.emergencyContact.phone} onChange={handleEmergencyChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-semibold text-gray-700">Relation</label>
                          <input type="text" name="relation" value={formData.emergencyContact.relation} onChange={handleEmergencyChange} className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                      <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-4 rounded-2xl hover:bg-violet-50 transition-all">
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
                        <span className="font-medium">Active Staff Member</span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="border-t border-gray-100 px-8 py-6 flex justify-between items-center bg-gray-50">
              <button type="button" onClick={prevStep} disabled={currentStep === 0} className="px-8 py-3.5 text-gray-600 disabled:opacity-40 hover:bg-white rounded-2xl font-medium transition-all active:scale-95">
                ← Previous
              </button>
              {currentStep === steps.length - 1 ? (
                <button type="button" disabled={saving} className="flex items-center gap-3 px-10 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all disabled:opacity-70 active:scale-[0.97]">
                  <FaSave /> {saving ? "Saving..." : "Update Staff Member"}
                </button>
              ) : (
                <button type="button" onClick={nextStep} className="flex items-center gap-3 px-10 py-3.5 bg-violet-600 text-white rounded-2xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all active:scale-[0.97]">
                  Next Step →
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}