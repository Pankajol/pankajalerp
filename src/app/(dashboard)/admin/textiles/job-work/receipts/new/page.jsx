"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";
import Select from "react-select";

export default function NewJobWorkReceipt() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    challan: "",
    toWarehouse: "",
    vendorChallanNo: "",
    vendorLotNo: "",
    receivedDate: new Date().toISOString().split("T")[0],
    items: [],
    lotComplete: false,
    processLoss: 0,
    wastage: 0,
    shortage: 0,
    reason: "",
  });
  const [challans, setChallans] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Load issued challans and warehouses
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const [chalRes, whRes] = await Promise.all([
          api.get("/textiles/job-work-challans?status=issued", headers),
          api.get("/warehouse", headers),
        ]);
        const challanData = chalRes.data.data || [];
        setChallans(challanData);
        setWarehouses(whRes.data.data || []);
        const requestedId = new URLSearchParams(window.location.search).get("challanId");
        const requested = challanData.find((item) => item._id === requestedId);
        if (requested) {
          setSelectedChallan(requested);
          setFormData((current) => ({
            ...current,
            challan: requested._id,
            toWarehouse: requested.toWarehouse?._id || "",
            vendorChallanNo: requested.vendorChallanNo || "",
            items: requested.items.map((item) => ({
              taka: item.taka?._id || item.taka, takaNumber: item.taka?.takaNumber,
              challanQuantity: item.quantity, receivedQuantity: 0, actualMeters: 0,
              finishedItem: item.item?._id || item.item || item.taka?.fabric?._id || item.taka?.fabric || "", batch: item.batch || "", uom: item.uom || "Mtr",
              rejectedQuantity: 0, wastageQuantity: 0, shortQuantity: 0,
              lumpNo: "", baseDocEntry: "", notes: "",
            })),
          }));
        }
        setFetching(false);
      } catch {
        toast.error("Failed to load master data");
        setFetching(false);
      }
    };
    loadMasters();
  }, []);

  // When challan changes, populate items and vendor
  const handleChallanChange = (selectedOption) => {
    const chalId = selectedOption ? selectedOption.value : "";
    setFormData((prev) => ({ ...prev, challan: chalId }));
    const chal = challans.find((c) => c._id === chalId);
    setSelectedChallan(chal);
    if (chal) {
      const items = chal.items.map((item) => ({
        taka: item.taka?._id || item.taka,
        takaNumber: item.taka?.takaNumber,
        challanQuantity: item.quantity,
        receivedQuantity: 0,
        finishedItem: item.item?._id || item.item || item.taka?.fabric?._id || item.taka?.fabric || "",
        batch: item.batch || "", uom: item.uom || "Mtr", rejectedQuantity: 0, wastageQuantity: 0, shortQuantity: 0,
        actualMeters: 0,
        lumpNo: "",
        baseDocEntry: "",
        notes: "",
      }));
      setFormData((prev) => ({
        ...prev,
        items,
        toWarehouse: chal.toWarehouse?._id || "",
        vendorChallanNo: chal.vendorChallanNo || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, items: [] }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => ({ ...prev, items: prev.items.map((item, rowIndex) => rowIndex === index ? { ...item, [field]: value } : item) }));
  };

  // Auto-calculate shrinkage totals
  const totalChallanQty = formData.items.reduce((sum, i) => sum + (i.challanQuantity || 0), 0);
  const totalReceivedQty = formData.items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0);
  const shrinkageMeter = totalChallanQty - totalReceivedQty;
  const shrinkagePercent = totalChallanQty ? (shrinkageMeter / totalChallanQty) * 100 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.some((i) => i.receivedQuantity <= 0)) {
      return toast.warn("All items must have received quantity > 0");
    }
    // Update totals in formData
    const payload = {
      ...formData,
      totalChallanQty,
      totalReceivedQty,
      commercialShrinkageMeter: shrinkageMeter,
      commercialShrinkagePercent: shrinkagePercent,
    };
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.post("/textiles/job-work-receipts", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Receipt created!");
      router.push(`/admin/textiles/job-work/receipts/${response.data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  const challanOptions = challans.map((c) => ({
    value: c._id,
    label: `${c.challanNumber} - ${c.vendor?.supplierName || "Vendor"} (${c.process})`,
  }));

  if (fetching) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        Create Job Work Receipt
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Challan */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Issued Challan *</label>
          <Select
            options={challanOptions}
            value={challanOptions.find((option) => option.value === formData.challan) || null}
            onChange={handleChallanChange}
            placeholder="Select challan..."
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
          {selectedChallan && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
              <p><strong>Vendor:</strong> {selectedChallan.vendor?.supplierName || "—"}</p>
              <p><strong>Process:</strong> {selectedChallan.process}</p>
              <p><strong>Total Challan Qty:</strong> {selectedChallan.totalQuantity} Mtr</p>
            </div>
          )}
        </div>

        {/* Warehouse & Vendor Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">To Warehouse *</label>
            <select
              name="toWarehouse"
              value={formData.toWarehouse}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.warehouseName || w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vendor Challan No.</label>
            <input
              name="vendorChallanNo"
              value={formData.vendorChallanNo}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Vendor Lot No.</label>
            <input
              name="vendorLotNo"
              value={formData.vendorLotNo}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Received Date</label>
            <input
              type="date"
              name="receivedDate"
              value={formData.receivedDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          </div>
        </div>

        {/* Items List with received quantity entry */}
        {formData.items.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Received Quantities
            </label>
            <div className="space-y-2">
              {formData.items.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-mono text-sm text-emerald-600 w-24">
                    {item.takaNumber || "Taka"}
                  </span>
                  <span className="text-xs text-gray-500 w-16">
                    Challan: {item.challanQuantity}
                  </span>
                  <input
                    type="number"
                    placeholder="Received Qty"
                    value={item.receivedQuantity}
                    onChange={(e) => handleItemChange(idx, "receivedQuantity", parseFloat(e.target.value))}
                    className="w-24 p-1 border border-gray-300 rounded"
                    step="0.01"
                    min="0.01"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Actual Mtr"
                    value={item.actualMeters}
                    onChange={(e) => handleItemChange(idx, "actualMeters", parseFloat(e.target.value))}
                    className="w-24 p-1 border border-gray-300 rounded"
                    step="0.01"
                    min="0"
                  />
                  <input
                    placeholder="Lump No."
                    value={item.lumpNo}
                    onChange={(e) => handleItemChange(idx, "lumpNo", e.target.value)}
                    className="w-20 p-1 border border-gray-300 rounded"
                  />
                  <input type="number" min="0" step="0.01" placeholder="Rejected" value={item.rejectedQuantity || 0} onChange={(e) => handleItemChange(idx, "rejectedQuantity", Number(e.target.value))} className="w-20 p-1 border border-gray-300 rounded" />
                  <input type="number" min="0" step="0.01" placeholder="Wastage" value={item.wastageQuantity || 0} onChange={(e) => handleItemChange(idx, "wastageQuantity", Number(e.target.value))} className="w-20 p-1 border border-gray-300 rounded" />
                  <input type="number" min="0" step="0.01" placeholder="Short" value={item.shortQuantity || 0} onChange={(e) => handleItemChange(idx, "shortQuantity", Number(e.target.value))} className="w-20 p-1 border border-gray-300 rounded" />
                  <input placeholder="Batch" value={item.batch || ""} onChange={(e) => handleItemChange(idx, "batch", e.target.value)} className="w-24 p-1 border border-gray-300 rounded" />
                  <span className="text-xs text-gray-400">Mtr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shrinkage Summary */}
        {totalChallanQty > 0 && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-700">Shrinkage Summary</h4>
            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
              <div>
                <span className="text-gray-500">Total Challan Qty:</span>
                <span className="font-bold ml-2">{totalChallanQty} Mtr</span>
              </div>
              <div>
                <span className="text-gray-500">Total Received Qty:</span>
                <span className="font-bold ml-2">{totalReceivedQty} Mtr</span>
              </div>
              <div>
                <span className="text-gray-500">Shrinkage:</span>
                <span className={`font-bold ml-2 ${shrinkagePercent > 5 ? "text-red-500" : "text-gray-700"}`}>
                  {shrinkageMeter} Mtr ({shrinkagePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <label className="text-xs text-gray-500">Process Loss (Mtr)</label>
                <input
                  type="number"
                  name="processLoss"
                  value={formData.processLoss}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Wastage (Mtr)</label>
                <input
                  type="number"
                  name="wastage"
                  value={formData.wastage}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Shortage (Mtr)</label>
                <input
                  type="number"
                  name="shortage"
                  value={formData.shortage}
                  onChange={handleChange}
                  className="w-full p-1 border border-gray-300 rounded"
                  step="0.01"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="text-xs text-gray-500">Reason</label>
              <input
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full p-1 border border-gray-300 rounded"
                placeholder="Reason for shortage/wastage"
              />
            </div>
          </div>
        )}

        {/* Lot Complete */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="lotComplete"
            checked={formData.lotComplete}
            onChange={handleChange}
            className="w-4 h-4"
          />
          <label className="text-sm font-medium text-gray-700">Lot Complete</label>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <FaSave size={14} /> {loading ? "Creating..." : "Create Receipt"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            <FaTimes size={14} /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
