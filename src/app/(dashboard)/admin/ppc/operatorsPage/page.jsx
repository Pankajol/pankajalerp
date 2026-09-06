// src/app/(dashboard)/ppc/operators/page.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";
import Select from "react-select";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OperatorPage = () => {
  const [operators, setOperators] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOperator, setCurrentOperator] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Generate Operator Code
  const generateOperatorCode = (count) => {
    const nextNum = count + 1;
    return `OPR${String(nextNum).padStart(3, "0")}`;
  };

  // Fetch Operators
  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");

      const res = await fetch(`/api/ppc/operators?searchQuery=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch operators");

      const data = await res.json();
      setOperators(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // Fetch Employees
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawUsers = Array.isArray(res.data.data)
        ? res.data.data
        : res.data;

      const employeeOptions = rawUsers
        .filter((u) => u.roles?.includes("Employee"))
        .map((emp) => ({
          value: emp._id,
          label: emp.name || `${emp.firstName} ${emp.lastName}`,
          code: emp.code || emp.employeeCode || "",
        }));

      setEmployees(employeeOptions);
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("Failed to load employees.");
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchOperators();
    fetchEmployees();
  }, [fetchOperators]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOperators();
  };

  const openModal = (operator = null) => {
    setCurrentOperator(
      operator
        ? { ...operator }
        : { employeeId: "", operatorCode: "", name: "", cost: "" }
    );
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentOperator(null);
    setModalError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentOperator((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (selectedOption) => {
    if (!selectedOption) {
      setCurrentOperator((prev) => ({
        ...prev,
        employeeId: "",
        name: "",
      }));
      return;
    }
    setCurrentOperator((prev) => ({
      ...prev,
      employeeId: selectedOption.value,
      name: selectedOption.label,
    }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setModalError("Authentication token not found.");

    setIsSaving(true);
    setModalError(null);

    try {
      let payload = { ...currentOperator };

      if (!payload.operatorCode) {
        payload.operatorCode = generateOperatorCode(operators.length);
      }

      const method = payload._id ? "PUT" : "POST";
      const url = payload._id
        ? `/api/ppc/operators/${payload._id}`
        : "/api/ppc/operators";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save operator");
      }

      await fetchOperators();
      closeModal();
      toast.success("✅ Operator saved successfully!");
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return setError("Authentication token missing.");

    if (window.confirm("Are you sure you want to delete this operator?")) {
      try {
        const res = await fetch(`/api/ppc/operators/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to delete operator");
        await fetchOperators();
        toast.success("🗑️ Operator deleted successfully!");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Skeleton rows for loading
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
      <td className="p-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
    </tr>
  );

  return (
    <div className="p-8 font-sans bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Operator Management</h1>
          <p className="text-gray-500 text-sm">Manage your production operators</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus size={18} /> Add Operator
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or code..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
          >
            Search
          </button>
        </form>
        <div className="text-sm text-gray-500">
          {operators.length} {operators.length === 1 ? "operator" : "operators"} found
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">Operator Code</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">Cost / Hour</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
          ❌ {error}
        </div>
      ) : operators.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-gray-700">No operators found</h3>
          <p className="text-gray-500 mt-1">Get started by adding your first operator.</p>
          <button
            onClick={() => openModal()}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2 transition"
          >
            <Plus size={18} /> Add Operator
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Operator Code</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Cost / Hour</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr
                    key={op._id}
                    className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors duration-150"
                  >
                    <td className="p-4 font-mono text-sm">{op.operatorCode}</td>
                    <td className="p-4 font-medium text-gray-800">{op.name}</td>
                    <td className="p-4">${op.cost}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openModal(op)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(op._id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {currentOperator?._id ? "Edit Operator" : "Add Operator"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={24} />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee
                </label>
                <Select
                  options={employees}
                  value={
                    employees.find(
                      (emp) => emp.value === currentOperator?.employeeId
                    ) || null
                  }
                  onChange={handleEmployeeSelect}
                  isClearable
                  isLoading={loadingEmployees}
                  placeholder="Search employee..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: "0.75rem",
                      borderColor: "#e5e7eb",
                      "&:hover": { borderColor: "#93c5fd" },
                    }),
                  }}
                />
              </div>

              <input
                name="operatorCode"
                type="text"
                placeholder="Operator Code (auto-generated if empty)"
                value={currentOperator?.operatorCode || ""}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
              />

              <input
                name="name"
                type="text"
                placeholder="Full Name"
                value={currentOperator?.name || ""}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
              />

              <input
                name="cost"
                type="number"
                step="0.01"
                placeholder="Cost per Hour ($)"
                value={currentOperator?.cost || ""}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Operator"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional: Tailwind animation for modal */}
      <style jsx>{`
        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default OperatorPage;



// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import { Plus, Edit, Trash2 } from "lucide-react";
// import Select from "react-select";
// import axios from "axios";
// import { toast } from "react-toastify";

// const OperatorPage = () => {
//   const [operators, setOperators] = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [loadingEmployees, setLoadingEmployees] = useState(true);

//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentOperator, setCurrentOperator] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isSaving, setIsSaving] = useState(false);
//   const [modalError, setModalError] = useState(null);

//   // ✅ Fetch Operators
//   const fetchOperators = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Authentication token missing.");

//       const res = await fetch(`/api/ppc/operators?searchQuery=${searchQuery}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!res.ok) throw new Error("Failed to fetch operators");

//       const data = await res.json();
//       setOperators(data.data || []);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [searchQuery]);

//   // ✅ Fetch Employees (for dropdown)
//   const fetchEmployees = async () => {
//     setLoadingEmployees(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Authentication token missing.");

//       const res = await axios.get("/api/company/users", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const rawUsers = Array.isArray(res.data.data)
//         ? res.data.data
//         : res.data;

//       const employeeOptions = rawUsers
//         .filter((u) => u.roles?.includes("Employee"))
//         .map((emp) => ({
//           value: emp._id,
//           label: emp.name || `${emp.firstName} ${emp.lastName}` || "Unnamed",
//           code: emp.code || emp.employeeCode || "", // optional field mapping
//         }));

//       setEmployees(employeeOptions);
//     } catch (err) {
//       console.error("Error fetching employees:", err);
//       toast.error("Failed to load employees.");
//     } finally {
//       setLoadingEmployees(false);
//     }
//   };

//   useEffect(() => {
//     fetchOperators();
//     fetchEmployees();
//   }, [fetchOperators]);

//   const handleSearch = (e) => {
//     e.preventDefault();
//     fetchOperators();
//   };

//   const openModal = (operator = null) => {
//     setCurrentOperator(
//       operator
//         ? { ...operator }
//         : { employeeId: "", code: "", name: "", cost: "" }
//     );
//     setModalError(null);
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setCurrentOperator(null);
//     setModalError(null);
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentOperator((prev) => ({ ...prev, [name]: value }));
//   };

//   // ✅ When employee selected
//   const handleEmployeeSelect = (selectedOption) => {
//     if (!selectedOption) {
//       setCurrentOperator((prev) => ({
//         ...prev,
//         employeeId: "",
//         code: "",
//         name: "",
//       }));
//       return;
//     }
//     setCurrentOperator((prev) => ({
//       ...prev,
//       employeeId: selectedOption.value,
//       name: selectedOption.label,
//       code: selectedOption.code || "",
//     }));
//   };

//   const handleSave = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setModalError("Authentication token not found. Please log in again.");
//       return;
//     }

//     setIsSaving(true);
//     setModalError(null);
//     const method = currentOperator._id ? "PUT" : "POST";
//     const url = currentOperator._id
//       ? `/api/ppc/operators/${currentOperator._id}`
//       : "/api/ppc/operators";

//     try {
//       const res = await fetch(url, {
//         method,
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(currentOperator),
//       });

//       if (!res.ok) {
//         const errData = await res.json();
//         throw new Error(errData.message || "Failed to save operator");
//       }

//       await fetchOperators();
//       closeModal();
//       toast.success("Operator saved successfully!");
//     } catch (err) {
//       setModalError(err.message);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setError("Authentication token missing.");
//       return;
//     }

//     if (window.confirm("Are you sure you want to delete this operator?")) {
//       try {
//         const res = await fetch(`/api/ppc/operators/${id}`, {
//           method: "DELETE",
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (!res.ok) throw new Error("Failed to delete operator");

//         await fetchOperators();
//         toast.success("Operator deleted successfully!");
//       } catch (err) {
//         setError(err.message);
//       }
//     }
//   };

//   return (
//     <div className="p-8 font-sans bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">
//         Operator Management
//       </h1>

//       {/* Search and Add */}
//       <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//         <div className="flex justify-between items-center">
//           <form onSubmit={handleSearch} className="flex gap-2">
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Search by name or code..."
//               className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
//             />
//             <button
//               type="submit"
//               className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
//             >
//               Search
//             </button>
//           </form>

//           <button
//             onClick={() => openModal()}
//             className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
//           >
//             <Plus size={18} />
//             Add Operator
//           </button>
//         </div>
//       </div>

//       {/* Operator Table */}
//       {isLoading ? (
//         <p className="text-center">Loading...</p>
//       ) : error ? (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
//           {error}
//         </div>
//       ) : (
//         <div className="bg-white rounded-lg shadow-md overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-4">Code</th>
//                 <th className="p-4">Name</th>
//                 <th className="p-4">Cost/Hour</th>
//                 <th className="p-4">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {operators.map((op) => (
//                 <tr key={op._id} className="border-b hover:bg-gray-50">
//                   <td className="p-4">{op.code}</td>
//                   <td className="p-4">{op.name}</td>
//                   <td className="p-4">{`$${op.cost}`}</td>
//                   <td className="p-4 flex gap-2">
//                     <button
//                       onClick={() => openModal(op)}
//                       className="text-blue-500 hover:text-blue-700"
//                     >
//                       <Edit size={18} />
//                     </button>
//                     <button
//                       onClick={() => handleDelete(op._id)}
//                       className="text-red-500 hover:text-red-700"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
//             <h2 className="text-2xl font-bold mb-4">
//               {currentOperator?._id ? "Edit Operator" : "Add Operator"}
//             </h2>

//             {modalError && (
//               <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//                 {modalError}
//               </div>
//             )}

//             <div className="space-y-4">
//               {/* ✅ Searchable Employee Select */}
//               <div>
//                 <label className="block mb-1 text-sm font-medium">
//                   Select Employee
//                 </label>
//                 <Select
//                   options={employees}
//                   value={
//                     employees.find(
//                       (emp) => emp.value === currentOperator?.employeeId
//                     ) || null
//                   }
//                   onChange={handleEmployeeSelect}
//                   isClearable
//                   isLoading={loadingEmployees}
//                   placeholder="Search and select employee..."
//                 />
//               </div>

//               <input
//                 name="code"
//                 type="text"
//                 placeholder="Code"
//                 value={currentOperator?.code || ""}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />

//               <input
//                 name="name"
//                 type="text"
//                 placeholder="Name"
//                 value={currentOperator?.name || ""}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />

//               <input
//                 name="cost"
//                 type="number"
//                 placeholder="Cost per Hour"
//                 value={currentOperator?.cost || ""}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />
//             </div>

//             <div className="mt-6 flex justify-end gap-4">
//               <button
//                 onClick={closeModal}
//                 className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
//                 disabled={isSaving}
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleSave}
//                 className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
//                 disabled={isSaving}
//               >
//                 {isSaving ? "Saving..." : "Save"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OperatorPage;




// "use client";
// import React, { useState, useEffect, useCallback } from 'react';
// import { Plus, Edit, Trash2 } from 'lucide-react';

// const OperatorPage = () => {
//   const [operators, setOperators] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null); // For fetch/delete errors
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentOperator, setCurrentOperator] = useState(null);
//   const [searchQuery, setSearchQuery] = useState('');
  
//   // New state for modal actions
//   const [isSaving, setIsSaving] = useState(false);
//   const [modalError, setModalError] = useState(null);

//   const fetchOperators = useCallback(async () => {
//     setIsLoading(true);
//     setError(null); // Clear previous errors
//     try {
//         const token = localStorage.getItem('token');
//         if (!token) {
//             setError('Authentication token not found. Please log in again.');
//             setIsLoading(false);
//             return;
//         }
//       const response = await fetch(`/api/ppc/operators?searchQuery=${searchQuery}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
//       if (!response.ok) throw new Error('Failed to fetch operators');
//       const data = await response.json();
//       setOperators(data.data || []);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [searchQuery]);

//   useEffect(() => {
//     fetchOperators();
//   }, [fetchOperators]);
  
//   const handleSearch = (e) => {
//     e.preventDefault();
//     fetchOperators();
//   };

//   const openModal = (operator = null) => {
//     setCurrentOperator(operator ? { ...operator } : { code: '', name: '', cost: '' });
//     setModalError(null); // Clear previous modal errors
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setCurrentOperator(null);
//     setModalError(null);
//   };
  
//   // Consolidated input change handler
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentOperator(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async () => {
//     const token = localStorage.getItem('token'); // Adjust as needed for your auth
//       if (!token) {
//         setModalError('Authentication token not found. Please log in again.');
//         return;
//       }
      
//     setIsSaving(true);
//     setModalError(null);
//     const method = currentOperator._id ? 'PUT' : 'POST';
//     const url = currentOperator._id ? `/api/ppc/operators/${currentOperator._id}` : '/api/ppc/operators';

//     try {
//       const response = await fetch(url, {
//         method,
//         headers: { 
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(currentOperator),
//       });
//       if (!response.ok) {
//         const errData = await response.json();
//         throw new Error(errData.message || 'Failed to save operator');
//       }
//       await fetchOperators();
//       closeModal();
//     } catch (err) {
//       setModalError(err.message);
//     } finally {
//         setIsSaving(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//         setError('Authentication token not found. Please log in again.');
//         return;
//     }

//     if (window.confirm('Are you sure you want to delete this operator?')) {
//       try {
//         const response = await fetch(`/api/ppc/operators/${id}`, { 
//             method: 'DELETE',
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (!response.ok) {
//            const errData = await response.json();
//            throw new Error(errData.message || 'Failed to delete operator');
//         }
//         await fetchOperators();
//       } catch (err) {
//         setError(err.message); // Show delete error on the main page
//       }
//     }
//   };

//   return (
//     <div className="p-8 font-sans bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">Operator Management</h1>
      
//       <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//         <div className="flex justify-between items-center">
//           <form onSubmit={handleSearch} className="flex gap-2">
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Search by name or code..."
//               className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
//             />
//              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
//               Search
//             </button>
//           </form>
//           <button onClick={() => openModal()} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2">
//             <Plus size={18} />
//             Add Operator
//           </button>
//         </div>
//       </div>

//       {isLoading && <p className="text-center">Loading...</p>}
//       {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
//       {!isLoading && !error && (
//         <div className="bg-white rounded-lg shadow-md overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-4">Code</th>
//                 <th className="p-4">Name</th>
//                 <th className="p-4">Cost per Hour</th>
//                 <th className="p-4">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {operators.map((operator) => (
//                 <tr key={operator._id} className="border-b hover:bg-gray-50">
//                   <td className="p-4">{operator.code}</td>
//                   <td className="p-4">{operator.name}</td>
//                   <td className="p-4">{`$${operator.cost}`}</td>
//                   <td className="p-4 flex gap-2">
//                     <button onClick={() => openModal(operator)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
//                     <button onClick={() => handleDelete(operator._id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
//             <h2 className="text-2xl font-bold mb-4">{currentOperator?._id ? 'Edit Operator' : 'Add Operator'}</h2>
            
//             {modalError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{modalError}</div>}

//             <div className="space-y-4">
//               <input name="code" type="text" placeholder="Code" value={currentOperator.code} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
//               <input name="name" type="text" placeholder="Name" value={currentOperator.name} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
//               <input name="cost" type="number" placeholder="Cost per Hour" value={currentOperator.cost} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
//             </div>
//             <div className="mt-6 flex justify-end gap-4">
//               <button onClick={closeModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400" disabled={isSaving}>Cancel</button>
//               <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300" disabled={isSaving}>
//                 {isSaving ? 'Saving...' : 'Save'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OperatorPage;

