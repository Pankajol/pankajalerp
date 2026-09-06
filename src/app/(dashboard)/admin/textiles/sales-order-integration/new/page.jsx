"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaSave, FaTimes } from "react-icons/fa";

const inputClass = "w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-400";

export default function NewSalesOrderIntegration() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    salesOrder: "", customer: "", plant: "", plannedQuantity: 0,
    priority: 1, priorityLabel: "Normal", deliveryDate: "", requiredDate: "",
    productionItems: [], remarks: "",
  });
  const [salesOrders, setSalesOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
        const [soRes, warehouseRes] = await Promise.all([
          api.get("/sales-order?limit=100", headers), api.get("/warehouse?limit=100", headers),
        ]);
        setSalesOrders(soRes.data.data || []);
        setWarehouses(warehouseRes.data.data || []);
      } catch { toast.error("Failed to load sales orders or plants"); }
      finally { setFetching(false); }
    };
    load();
  }, []);

  const plannedTotal = useMemo(() => formData.productionItems.reduce((sum, row) => sum + Number(row.quantity || 0), 0), [formData.productionItems]);
  const handleChange = ({ target: { name, value } }) => {
    const labels = { 1: "Normal", 2: "High", 3: "Urgent" };
    setFormData((prev) => ({ ...prev, [name]: value, ...(name === "priority" ? { priorityLabel: labels[value] } : {}) }));
  };
  const handleSalesOrderChange = ({ target: { value: salesOrder } }) => {
    const so = salesOrders.find((entry) => entry._id === salesOrder);
    const rows = (so?.items || []).map((row, index) => ({
      item: row.item?._id || row.item || "", itemName: row.itemName || row.item?.itemName || row.itemCode || `Item ${index + 1}`,
      fabricSpecification: row.fabricSpecification || "", color: row.color || "", shade: row.shade || "",
      gsm: row.gsm || 0, width: row.width || 0, quantity: row.quantity || row.orderedQuantity || 0,
      uom: row.uom || row.unit || "Mtr", salesOrderItem: row.itemCode || String(index + 1),
    }));
    const date = so?.expectedDeliveryDate || so?.deliveryDate;
    setFormData((prev) => ({ ...prev, salesOrder, customer: so?.customer?._id || so?.customer || "",
      plannedQuantity: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0), deliveryDate: date?.split("T")[0] || "",
      requiredDate: date?.split("T")[0] || "", productionItems: rows }));
  };
  const updateRow = (index, name, value) => setFormData((prev) => ({ ...prev,
    productionItems: prev.productionItems.map((row, rowIndex) => rowIndex === index ? { ...row, [name]: value } : row) }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.productionItems.length) return toast.warn("Sales order must contain at least one production item");
    setLoading(true);
    try {
      await api.post("/textiles/sales-order-production", { ...formData, plannedQuantity: plannedTotal }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      toast.success("Textile production plan created"); router.push("/admin/textiles/sales-order-integration");
    } catch (error) { toast.error(error.response?.data?.message || "Integration failed"); }
    finally { setLoading(false); }
  };

  if (fetching) return <div className="p-6 text-center">Loading...</div>;
  return <div className="mx-auto max-w-7xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Sales → Production</p><h1 className="text-2xl font-extrabold text-gray-900">Create Textile Production Plan</h1></div>
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-gray-700 lg:col-span-2">Sales Order *<select value={formData.salesOrder} onChange={handleSalesOrderChange} required className={inputClass}><option value="">Select Sales Order</option>{salesOrders.map((so) => <option key={so._id} value={so._id}>{so.documentNumberOrder || so.orderNumber || so.salesNumber} — {so.customerName || so.customer?.name}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Plant / Warehouse<select name="plant" value={formData.plant} onChange={handleChange} className={inputClass}><option value="">Select plant</option>{warehouses.map((row) => <option key={row._id} value={row._id}>{row.warehouseName || row.name || row.code}</option>)}</select></label>
        <label className="text-sm font-medium text-gray-700">Priority<select name="priority" value={formData.priority} onChange={handleChange} className={inputClass}><option value="1">Normal</option><option value="2">High</option><option value="3">Urgent</option></select></label>
        <label className="text-sm font-medium text-gray-700">Required Date<input type="date" name="requiredDate" value={formData.requiredDate} onChange={handleChange} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700">Delivery Date<input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700">Planned Quantity<input value={plannedTotal} readOnly className={`${inputClass} bg-gray-50`} /></label>
        <label className="text-sm font-medium text-gray-700">Customer<input value={salesOrders.find((so) => so._id === formData.salesOrder)?.customerName || "Auto-filled"} readOnly className={`${inputClass} bg-gray-50`} /></label>
      </section>
      <section><div className="mb-2"><h2 className="font-bold text-gray-800">Production Items</h2><p className="text-xs text-gray-500">Complete the textile specification for every sales-order line.</p></div>
        <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="min-w-[1100px] w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr>{["Item", "Fabric Specification", "Color", "Shade", "GSM", "Width", "Qty", "UOM", "SO Item"].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>{formData.productionItems.map((row, index) => <tr key={`${row.salesOrderItem}-${index}`} className="border-t border-gray-100"><td className="p-2 font-medium">{row.itemName}</td>{["fabricSpecification", "color", "shade", "gsm", "width", "quantity", "uom", "salesOrderItem"].map((name) => <td key={name} className="p-2"><input type={["gsm", "width", "quantity"].includes(name) ? "number" : "text"} min="0" step="0.01" value={row[name] ?? ""} onChange={(event) => updateRow(index, name, event.target.value)} className="w-full min-w-24 rounded-lg border border-gray-200 p-2 outline-none focus:border-blue-400" /></td>)}</tr>)}</tbody></table>
          {!formData.productionItems.length && <p className="p-8 text-center text-sm text-gray-400">Select a sales order to load its items.</p>}
        </div></section>
      <label className="block text-sm font-medium text-gray-700">Remarks<textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={2} className={inputClass} /></label>
      <div className="flex gap-4"><button disabled={loading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"><FaSave size={14} />{loading ? "Saving..." : "Create Production Plan"}</button><button type="button" onClick={() => router.back()} className="flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-bold text-gray-700"><FaTimes size={14} />Cancel</button></div>
    </form>
  </div>;
}
