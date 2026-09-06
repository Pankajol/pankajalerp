"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaArrowLeft,
  FaSave,
  FaUser,
  FaGraduationCap,
  FaUsers,
  FaHeart,
  FaCheckCircle,
  FaHome,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function EditStudent() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [students, setStudents] = useState([]);

  // --- Toggle for house form ---
  const [showHouseForm, setShowHouseForm] = useState(false);

  // --- Form state ---
  const [formData, setFormData] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male",
    email: "",
    password: "",
    phone: "",
    address: "",
    class: "",
    section: "",
    rollNumber: "",
    isActive: true,
    isScholar: false,
    parent: {
      name: "",
      phone: "",
      email: "",
      relation: "father",
    },
    parentPassword: "",
    siblings: [],
  });

  // --- House info (optional) ---
  const [houseInfo, setHouseInfo] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "",
    pin: "",
  });

  // --- Validation errors ---
  const [errors, setErrors] = useState({});

  const steps = [
    { title: "Personal Info", icon: FaUser, description: "Basic details" },
    { title: "Academic", icon: FaGraduationCap, description: "Class & Section" },
    { title: "Guardian", icon: FaHeart, description: "Parent details" },
    { title: "Siblings", icon: FaUsers, description: "Family links" },
    { title: "House", icon: FaHome, description: "House address" },
  ];

  // --- Fetch data (student, siblings) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [studentRes, studentsRes] = await Promise.all([
          api.get(`/school/students/${id}`, headers),
          api.get("/school/students", { params: { limit: 1000 }, ...headers }),
        ]);

        const data = studentRes.data.data;

        setFormData({
          studentId: data.studentId || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
          gender: data.gender || "male",
          email: data.email || "",
          password: "",
          phone: data.phone || "",
          address: data.address || "",
          class: data.class || "",
          section: data.section || "",
          rollNumber: data.rollNumber || "",
          isActive: data.isActive !== undefined ? data.isActive : true,
          isScholar: data.isScholar || false,
          parent: {
            name: data.parent?.name || "",
            phone: data.parent?.phone || "",
            email: data.parent?.email || "",
            relation: data.parent?.relation || "father",
          },
          parentPassword: "",
          siblings: data.siblings?.map((s) => s._id) || [],
        });

        // Populate houseInfo if it exists
        if (data.houseInfo) {
          setHouseInfo({
            name: data.houseInfo.name || "",
            line1: data.houseInfo.line1 || "",
            line2: data.houseInfo.line2 || "",
            city: data.houseInfo.city || "",
            state: data.houseInfo.state || "",
            country: data.houseInfo.country || "",
            pin: data.houseInfo.pin || "",
          });
          if (data.houseInfo.name || data.houseInfo.line1) {
            setShowHouseForm(true);
          }
        }

        setStudents(studentsRes.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load student data");
        router.push("/school/students");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  // --- Validation helpers ---
  const validateStep = (step) => {
    const newErrors = {};
    if (step === 0) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Invalid email address";
      }
      if (formData.phone && !/^[0-9+\-\s()]{10,15}$/.test(formData.phone)) {
        newErrors.phone = "Invalid phone number";
      }
    }
    if (step === 1) {
      if (!formData.class.trim()) newErrors.class = "Class is required";
    }
    if (step === 2) {
      if (formData.parent.email && !/\S+@\S+\.\S+/.test(formData.parent.email)) {
        newErrors["parent.email"] = "Invalid parent email";
      }
      if (formData.parentPassword && formData.parentPassword.length < 6) {
        newErrors.parentPassword = "Parent password must be at least 6 characters";
      }
    }
    if (step === 4) {
      if (showHouseForm && houseInfo.pin && !/^\d{6}$/.test(houseInfo.pin)) {
        newErrors.housePin = "PIN must be exactly 6 digits";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleParentChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      parent: { ...prev.parent, [name]: value },
    }));
    setErrors((prev) => ({ ...prev, ["parent." + name]: "" }));
  };

  const handleHouseChange = (e) => {
    const { name, value } = e.target;
    setHouseInfo((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, housePin: "" }));
  };

  // --- PIN lookup ---
  const fetchPin = async (pin) => {
    if (pin.length !== 6) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const post = data[0]?.PostOffice?.[0];
        if (post) {
          setHouseInfo((prev) => ({
            ...prev,
            city: post.District || "",
            state: post.State || "",
            country: "India",
          }));
          setErrors((prev) => ({ ...prev, housePin: "" }));
        }
      } else {
        setErrors((prev) => ({ ...prev, housePin: "Invalid PIN code" }));
      }
    } catch {
      // ignore
    }
  };

  const handlePinChange = (e) => {
    const pin = e.target.value.replace(/\D/g, "").slice(0, 6);
    setHouseInfo((prev) => ({ ...prev, pin }));
    setErrors((prev) => ({ ...prev, housePin: "" }));
    if (pin.length === 6) {
      fetchPin(pin);
    }
  };

  // --- Navigation ---
  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
    } else {
      toast.error("Please fix all errors before proceeding");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  // --- Submit ---
  const handleSubmit = async () => {
    let allValid = true;
    for (let i = 0; i < steps.length; i++) {
      if (i === 3) continue;
      if (!validateStep(i)) allValid = false;
    }

    if (!allValid) {
      toast.error("Please fix all errors before submitting");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const submitData = {
        ...formData,
        houseInfo: showHouseForm ? houseInfo : null,
      };
      await api.put(`/school/students/${id}`, submitData, headers);
      toast.success("✅ Student updated successfully!");
      setTimeout(() => router.push(`/school/students/${id}`), 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // --- Sibling options (excluding self) ---
  const siblingOptions = students
    .filter((s) => s._id !== id)
    .map((s) => ({
      value: s._id,
      label: `${s.studentId} - ${s.firstName} ${s.lastName} (${s.class}${s.section ? `-${s.section}` : ""})`,
    }));

  // --- Render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading student profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all active:scale-95"
          >
            <FaArrowLeft size={22} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Edit Student
            </h1>
            <p className="text-gray-500 mt-1">
              ID: <span className="font-mono">{formData.studentId}</span>
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between mb-3 px-1">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex flex-col items-center ${index <= currentStep ? "text-indigo-600" : "text-gray-400"}`}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border-2 ${
                    index <= currentStep
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <step.icon size={24} />
                </motion.div>
                <div className="text-xs font-medium mt-2 hidden sm:block">{step.title}</div>
              </div>
            ))}
          </div>
          <div className="h-2.5 bg-gray-100 rounded-3xl overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl"
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <form onSubmit={(e) => { e.preventDefault(); }} className="relative" noValidate>
            <div onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}>
              <AnimatePresence mode="wait">

                {/* ===== STEP 0: PERSONAL INFO ===== */}
                {currentStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="p-8"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <FaUser size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">Personal Information</h2>
                        <p className="text-gray-500">Student's basic details</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Student ID</label>
                        <input
                          type="text"
                          value={formData.studentId}
                          className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded-2xl px-5 py-3 cursor-not-allowed"
                          disabled
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className={`w-full border ${errors.firstName ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          required
                        />
                        {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className={`w-full border ${errors.dateOfBirth ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          required
                        />
                        {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className={`w-full border ${errors.gender ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          required
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full border ${errors.email ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          placeholder="student@example.com"
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">
                          Reset Student Login Password
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          placeholder="Leave blank to keep current password"
                          minLength={6}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Phone</label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`w-full border ${errors.phone ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          placeholder="+91 98765 43210"
                        />
                        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">Student Address</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          placeholder="123 Main St, City"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ===== STEP 1: ACADEMIC ===== */}
                {currentStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="p-8"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <FaGraduationCap size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">Academic Information</h2>
                        <p className="text-gray-500">Class, section and roll number</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">
                          Class <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="class"
                          value={formData.class}
                          onChange={handleChange}
                          className={`w-full border ${errors.class ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          required
                          placeholder="10"
                        />
                        {errors.class && <p className="text-xs text-red-500">{errors.class}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Section</label>
                        <input
                          type="text"
                          name="section"
                          value={formData.section}
                          onChange={handleChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          placeholder="A"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Roll Number</label>
                        <input
                          type="number"
                          name="rollNumber"
                          value={formData.rollNumber}
                          onChange={handleChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          min="1"
                          placeholder="23"
                        />
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl cursor-pointer hover:bg-indigo-50 transition-all group">
                        <input
                          type="checkbox"
                          name="isScholar"
                          checked={formData.isScholar}
                          onChange={handleChange}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-medium">Scholar Student</div>
                          <div className="text-xs text-gray-500">Merit-based scholarship</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl cursor-pointer hover:bg-indigo-50 transition-all group">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-medium">Active Student</div>
                          <div className="text-xs text-gray-500">Currently enrolled</div>
                        </div>
                      </label>
                    </div>
                  </motion.div>
                )}

                {/* ===== STEP 2: GUARDIAN ===== */}
                {currentStep === 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="p-8"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <FaHeart size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">Parent / Guardian</h2>
                        <p className="text-gray-500">Contact information</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.parent.name}
                          onChange={handleParentChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          placeholder="Mr. Rajesh Sharma"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Phone Number</label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.parent.phone}
                          onChange={handleParentChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.parent.email}
                          onChange={handleParentChange}
                          className={`w-full border ${errors["parent.email"] ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          placeholder="parent@example.com"
                        />
                        {errors["parent.email"] && <p className="text-xs text-red-500">{errors["parent.email"]}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Relation</label>
                        <select
                          name="relation"
                          value={formData.parent.relation}
                          onChange={handleParentChange}
                          className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        >
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="guardian">Guardian</option>
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Reset Parent Login Password
                        </label>
                        <input
                          type="password"
                          name="parentPassword"
                          value={formData.parentPassword}
                          onChange={handleChange}
                          className={`w-full border ${errors.parentPassword ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                          placeholder="Leave blank to keep current password"
                          minLength={6}
                        />
                        {errors.parentPassword && <p className="text-xs text-red-500">{errors.parentPassword}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ===== STEP 3: SIBLINGS ===== */}
                {currentStep === 3 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="p-8"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <FaUsers size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">Siblings</h2>
                        <p className="text-gray-500">Link existing students as siblings</p>
                      </div>
                    </div>

                    <Select
                      options={siblingOptions}
                      value={siblingOptions.filter((o) => formData.siblings.includes(o.value))}
                      onChange={(selectedOptions) =>
                        setFormData((prev) => ({
                          ...prev,
                          siblings: selectedOptions.map((o) => o.value),
                        }))
                      }
                      placeholder="Search and select siblings..."
                      isMulti
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#e5e7eb",
                          borderRadius: "16px",
                          padding: "8px 4px",
                          minHeight: "56px",
                        }),
                      }}
                    />
                  </motion.div>
                )}

                {/* ===== STEP 4: HOUSE (optional) ===== */}
                {currentStep === 4 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="p-8"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <FaHome size={22} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">House Address</h2>
                        <p className="text-gray-500">Optionally add or update the student's house details</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showHouseForm}
                          onChange={(e) => {
                            setShowHouseForm(e.target.checked);
                            if (!e.target.checked) {
                              setHouseInfo({ name: "", line1: "", line2: "", city: "", state: "", country: "", pin: "" });
                              setErrors((prev) => ({ ...prev, housePin: "" }));
                            }
                          }}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="font-medium">Add house address</span>
                      </label>
                    </div>

                    {showHouseForm && (
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">House Name</label>
                          <input
                            type="text"
                            name="name"
                            placeholder="e.g., Blue House"
                            value={houseInfo.name}
                            onChange={handleHouseChange}
                            className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Address Line 1</label>
                          <input
                            type="text"
                            name="line1"
                            placeholder="Street, locality"
                            value={houseInfo.line1}
                            onChange={handleHouseChange}
                            className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Address Line 2 (optional)</label>
                          <input
                            type="text"
                            name="line2"
                            placeholder="Landmark, apartment"
                            value={houseInfo.line2}
                            onChange={handleHouseChange}
                            className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
                            <input
                              type="text"
                              name="city"
                              placeholder="City"
                              value={houseInfo.city}
                              onChange={handleHouseChange}
                              className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
                            <input
                              type="text"
                              name="state"
                              placeholder="State"
                              value={houseInfo.state}
                              onChange={handleHouseChange}
                              className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
                            <input
                              type="text"
                              name="country"
                              placeholder="Country"
                              value={houseInfo.country}
                              onChange={handleHouseChange}
                              className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">PIN Code</label>
                            <input
                              type="text"
                              placeholder="6-digit PIN"
                              value={houseInfo.pin}
                              onChange={handlePinChange}
                              maxLength="6"
                              className={`w-full border ${errors.housePin ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                            />
                            {errors.housePin && <p className="text-xs text-red-500 mt-1">{errors.housePin}</p>}
                            <p className="text-xs text-gray-400 mt-1">
                              Enter 6 digits to auto‑fill City, State & Country.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* ===== NAVIGATION BUTTONS ===== */}
            <div className="border-t border-gray-100 px-8 py-6 flex justify-between items-center bg-gray-50">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-8 py-3.5 text-gray-600 disabled:opacity-40 hover:bg-white rounded-2xl font-medium flex items-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              {currentStep === steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-3 px-10 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-70 active:scale-[0.97]"
                >
                  {saving ? "Saving..." : <><FaSave /> Update Student</>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-3 px-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all active:scale-[0.97]"
                >
                  Next Step →
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          All fields marked with * are required
        </p>
      </div>
    </div>
  );
}