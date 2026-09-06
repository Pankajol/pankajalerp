"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaSave,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapPin,
  FaBuilding,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { toast } from "react-toastify";

// ─── THEMES ──────────────────────────────────────────────────────────────
const THEMES = {
  erp: {
    name: "ERP Management",
    icon: "🏭",
    fields: [
      { name: "erpModules", label: "Primary ERP Modules", type: "text", required: true },
      { name: "employeeCount", label: "Approx. Employees", type: "number", required: true },
    ],
  },
  society: {
    name: "Society Management",
    icon: "🏘️",
    fields: [
      { name: "societyRegNo", label: "Society Registration No.", type: "text", required: true },
      { name: "totalFlats", label: "Total Flats / Units", type: "number", required: true },
      { name: "committeeName", label: "Committee / Association Name", type: "text", required: false },
    ],
  },
  healthcare: {
    name: "Healthcare Management",
    icon: "🏥",
    fields: [
      { name: "licenseNumber", label: "Medical License No.", type: "text", required: true },
      { name: "facilityType", label: "Facility Type", type: "text", required: true },
      { name: "bedCapacity", label: "Bed / Chair Capacity", type: "number", required: false },
    ],
  },
  education: {
    name: "Education Management",
    icon: "📚",
    fields: [
      { name: "institutionCode", label: "Institution Code", type: "text", required: true },
      { name: "boardOrUniversity", label: "Board / University", type: "text", required: true },
      { name: "studentCapacity", label: "Student Capacity", type: "number", required: false },
      { name: "subType", label: "Sub‑Type", type: "select", options: ["school", "college", "university", "institute"], required: false },
    ],
  },
  retail: {
    name: "Retail Management",
    icon: "🛒",
    fields: [
      { name: "storePan", label: "Store PAN / TIN", type: "text", required: false },
      { name: "outletCount", label: "Number of Outlets", type: "number", required: true },
      { name: "primaryCategory", label: "Primary Product Category", type: "text", required: true },
    ],
  },
  election: {
    name: "Election Management",
    icon: "🗳️",
    fields: [
      { name: "constituencyName", label: "Constituency / Ward", type: "text", required: true },
      { name: "electionType", label: "Election Type", type: "text", required: true },
      { name: "electionDate", label: "Election Date", type: "date", required: false },
      { name: "boothCount", label: "Approx. Booth Count", type: "number", required: true },
    ],
  },
};

const BUSINESS_TYPES = ["Pvt Ltd", "LLP", "Partnership", "Sole Proprietorship"];
const INDUSTRIES = ["Manufacturing", "IT / Software", "Retail", "Healthcare", "Education", "Real Estate / Society", "Political / Election", "Other"];

export default function CreateChildCompany() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({ password: false, confirmPwd: false });
  const [managementType, setManagementType] = useState("education");
  const theme = THEMES[managementType];

  // ─── Form state – includes all possible fields ──────────────────────
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    businessType: "",
    industry: "",
    gstNumber: "",
    country: "India",
    address: "",
    pinCode: "",
    password: "",
    confirmPwd: "",
    isActive: true,
    // Theme fields (will be reset on theme change)
    erpModules: "",
    employeeCount: "",
    societyRegNo: "",
    totalFlats: "",
    committeeName: "",
    licenseNumber: "",
    facilityType: "",
    bedCapacity: "",
    institutionCode: "",
    boardOrUniversity: "",
    studentCapacity: "",
    subType: "school", // default for education
    storePan: "",
    outletCount: "",
    primaryCategory: "",
    constituencyName: "",
    electionType: "",
    electionDate: "",
    boothCount: "",
  });
  const [errors, setErrors] = useState({});

  // ─── Helper to reset theme fields ────────────────────────────────────
  const resetThemeFields = (newType) => {
    const newTheme = THEMES[newType];
    const resetData = {};
    // Reset all theme fields to empty (or default for subType)
    const allFieldNames = Object.keys(THEMES).flatMap(t => THEMES[t].fields.map(f => f.name));
    allFieldNames.forEach(name => {
      if (name === "subType" && newType === "education") {
        resetData[name] = "school";
      } else {
        resetData[name] = "";
      }
    });
    setForm(prev => ({ ...prev, ...resetData }));
  };

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleThemeChange = (e) => {
    const newType = e.target.value;
    setManagementType(newType);
    resetThemeFields(newType);
    setErrors(prev => ({ ...prev }));
  };

  // ─── Validation ──────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!form.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!form.contactName.trim()) newErrors.contactName = "Contact name is required";
    if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Valid email required";
    if (!form.phone.trim()) newErrors.phone = "Phone required";
    if (!form.businessType) newErrors.businessType = "Select business type";
    if (!form.industry) newErrors.industry = "Select industry";
    if (!form.country) newErrors.country = "Select country";
    if (!form.address.trim()) newErrors.address = "Address required";
    if (!form.pinCode.trim()) newErrors.pinCode = "PIN / ZIP required";
    if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPwd) newErrors.confirmPwd = "Passwords do not match";

    theme.fields.forEach(f => {
      if (f.required && !form[f.name]?.toString().trim()) {
        newErrors[f.name] = `${f.label} required`;
      }
      if (f.type === "number" && form[f.name] && Number(form[f.name]) <= 0) {
        newErrors[f.name] = `${f.label} must be > 0`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Build payload with only the fields relevant to the current theme
      const themeData = {};
      theme.fields.forEach(f => {
        themeData[f.name] = form[f.name];
      });

      const payload = {
        companyName: form.companyName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        businessType: form.businessType,
        industry: form.industry,
        gstNumber: form.gstNumber || undefined,
        country: form.country,
        address: form.address,
        pinCode: form.pinCode,
        password: form.password,
        agreeToTerms: true,
        managementType: managementType,
        isActive: form.isActive,
        plan: "starter",
        paymentMethod: "trial",
        ...themeData,
      };

      await api.post("/company/signup", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Child company created successfully!");
      router.push("/admin/company");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false); 
    }
  };

  // ─── Render Helper for Theme Fields ──────────────────────────────────
  const renderField = (f) => {
    const value = form[f.name] ?? "";
    if (f.type === "select" && f.options) {
      return (
        <select
          key={f.name}
          name={f.name}
          value={value}
          onChange={handleChange}
          className={`w-full border ${errors[f.name] ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 bg-white`}
        >
          <option value="">Select {f.label}</option>
          {f.options.map(opt => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        key={f.name}
        name={f.name}
        type={f.type || "text"}
        placeholder={`${f.label}${f.required ? " *" : ""}`}
        value={value}
        onChange={handleChange}
        className={`w-full border ${errors[f.name] ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3`}
      />
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-3xl mx-auto">
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
              Create Child Company
            </h1>
            <p className="text-gray-500 mt-1">
              Add a subsidiary / branch under your organization
            </p>
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ─── Management Type ──────────────────────────────────── */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Management Type <span className="text-red-500">*</span>
              </label>
              <select
                value={managementType}
                onChange={handleThemeChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                {Object.keys(THEMES).map(key => (
                  <option key={key} value={key}>
                    {THEMES[key].name}
                  </option>
                ))}
              </select>
            </div>

            {/* ─── Identity ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Identity</h2>
              <input
                name="companyName"
                placeholder="Company / School Name *"
                value={form.companyName}
                onChange={handleChange}
                className={`w-full border ${errors.companyName ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3`}
              />
              {errors.companyName && <p className="text-xs text-red-500">{errors.companyName}</p>}
              <input
                name="contactName"
                placeholder="Contact Person *"
                value={form.contactName}
                onChange={handleChange}
                className={`w-full border ${errors.contactName ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3`}
              />
              {errors.contactName && <p className="text-xs text-red-500">{errors.contactName}</p>}
              <input
                name="email"
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={handleChange}
                className={`w-full border ${errors.email ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              <input
                name="phone"
                placeholder="Phone *"
                value={form.phone}
                onChange={handleChange}
                className={`w-full border ${errors.phone ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3`}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* ─── Business ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Business Profile</h2>
              <select
                name="businessType"
                value={form.businessType}
                onChange={handleChange}
                className={`w-full border ${errors.businessType ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 bg-white`}
              >
                <option value="">Select Business Type</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.businessType && <p className="text-xs text-red-500">{errors.businessType}</p>}
              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className={`w-full border ${errors.industry ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 bg-white`}
              >
                <option value="">Select Industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              {errors.industry && <p className="text-xs text-red-500">{errors.industry}</p>}
              <input
                name="gstNumber"
                placeholder="GST Number (optional)"
                value={form.gstNumber}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3"
              />
            </div>

            {/* ─── Address ───────────────────────────────────────────── */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Address</h2>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className={`w-full border ${errors.country ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 bg-white`}
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="UAE">UAE</option>
                <option value="Singapore">Singapore</option>
                <option value="Australia">Australia</option>
                <option value="Canada">Canada</option>
                <option value="Germany">Germany</option>
                <option value="Other">Other</option>
              </select>
              {errors.country && <p className="text-xs text-red-500">{errors.country}</p>}
              <input
                name="address"
                placeholder="Address *"
                value={form.address}
                onChange={handleChange}
                className={`w-full border ${errors.address ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3`}
              />
              {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              <input
                name="pinCode"
                placeholder="PIN / ZIP Code *"
                value={form.pinCode}
                onChange={handleChange}
                className={`w-full border ${errors.pinCode ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3`}
              />
              {errors.pinCode && <p className="text-xs text-red-500">{errors.pinCode}</p>}
            </div>

            {/* ─── Theme‑Specific Fields ────────────────────────────── */}
            {theme.fields.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
                  {theme.name} Details
                </h2>
                {theme.fields.map(f => (
                  <div key={f.name}>
                    {renderField(f)}
                    {errors[f.name] && <p className="text-xs text-red-500">{errors[f.name]}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Security ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Security</h2>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword.password ? "text" : "password"}
                  placeholder="Password * (min 8 chars)"
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full border ${errors.password ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, password: !p.password }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword.password ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>
              <div className="relative">
                <input
                  name="confirmPwd"
                  type={showPassword.confirmPwd ? "text" : "password"}
                  placeholder="Confirm Password *"
                  value={form.confirmPwd}
                  onChange={handleChange}
                  className={`w-full border ${errors.confirmPwd ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, confirmPwd: !p.confirmPwd }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword.confirmPwd ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
                {errors.confirmPwd && <p className="text-xs text-red-500">{errors.confirmPwd}</p>}
              </div>
            </div>

            {/* ─── Active ────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label className="text-sm font-medium text-gray-700">Active</label>
            </div>

            {/* ─── Submit ────────────────────────────────────────────── */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-8 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all disabled:opacity-70 active:scale-[0.97]"
              >
                <FaSave /> {loading ? "Creating..." : "Create Child Company"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}