export const EMPTY_TAKA = {
  takaNumber: "", productionOrder: "", lot: "", fabric: "", designRef: "",
  shade: "", quantity: "", weight: "", width: "", warehouse: "",
  fabricSpecification: "", color: "", gsm: "", qualityGrade: "",
  location: "", status: "created",
};

export const STATUS_OPTIONS = [
  ["created", "Created"], ["in-production", "In Production"],
  ["available", "Available"], ["job-work", "Job Work"],
  ["received", "Received"], ["qc", "QC"],
  ["finished", "Finished"], ["dispatched", "Dispatched"],
  ["reserved", "Reserved"], ["partially-sold", "Partially Sold"],
  ["sold", "Sold"], ["rejected", "Rejected"], ["hold", "Hold"], ["returned", "Returned"],
].map(([value, label]) => ({ value, label }));

export const REFERENCE_FIELDS = ["productionOrder", "lot", "fabric", "designRef", "shade", "warehouse"];
export const referenceId = (value) => typeof value === "string" ? value : value?._id?.toString() || "";

export function normalizeTaka(record) {
  return Object.fromEntries(Object.entries(EMPTY_TAKA).map(([key, fallback]) => [
    key, REFERENCE_FIELDS.includes(key) ? referenceId(record[key]) : record[key] ?? fallback,
  ]));
}

export function takaPayload(form) {
  const data = normalizeTaka(form);
  for (const key of REFERENCE_FIELDS) data[key] = data[key] || null;
  for (const key of ["quantity", "weight", "width", "gsm"]) {
    data[key] = data[key] === "" ? null : Number(data[key]);
  }
  for (const key of ["takaNumber", "location", "fabricSpecification", "color", "qualityGrade"]) data[key] = data[key].trim();
  return data;
}

export function validateTaka(data) {
  if (!data.takaNumber) return "Taka number is required.";
  if (!data.productionOrder) return "Please select a production order.";
  if (!data.fabric) return "Please select a fabric.";
  if (!data.designRef) return "Please select a design.";
  if (!Number.isFinite(data.quantity) || data.quantity <= 0) return "Quantity must be greater than zero.";
  for (const key of ["weight", "width", "gsm"]) {
    if (data[key] !== null && (!Number.isFinite(data[key]) || data[key] < 0)) return `${key === "weight" ? "Weight" : "Width"} cannot be negative or invalid.`;
  }
  if (!STATUS_OPTIONS.some(({ value }) => value === data.status)) return "Please select a valid status.";
  return "";
}

export function toOptions(records, field, current) {
  const labels = {
    productionOrder: (r) => r.productionDocNo || r.orderNumber,
    lot: (r) => r.lotNumber,
    fabric: (r) => [r.itemCode, r.itemName].filter(Boolean).join(" - "),
    designRef: (r) => [r.designCode, r.description].filter(Boolean).join(" - "),
    shade: (r) => [r.code, r.name].filter(Boolean).join(" - "),
    warehouse: (r) => [r.warehouseCode, r.warehouseName || r.name].filter(Boolean).join(" - "),
  };
  const merged = new Map(records.map((r) => [referenceId(r), r]));
  const id = referenceId(current);
  if (id && !merged.has(id)) merged.set(id, typeof current === "object" ? current : { _id: id });
  return [...merged].filter(([value]) => value).map(([value, record]) => ({
    value, label: labels[field](record) || `Saved selection (${value})`,
  }));
}

export async function loadAllOptions(api, url, signal) {
  const records = [];
  let page = 1;
  let pages = 1;
  do {
    const { data } = await api.get(url, { signal, params: { page, limit: 100 } });
    if (data?.success === false || !Array.isArray(data?.data)) {
      throw new Error(data?.message || data?.error || "Unable to load selections.");
    }
    records.push(...data.data);
    pages = data.meta?.pages ?? data.pagination?.pages ?? 1;
    page += 1;
  } while (page <= pages);
  return records;
}

export function nextTakaNumber(records) {
  const highest = records.reduce((max, { takaNumber }) => {
    const match = /^TAKA-(\d+)$/.exec(takaNumber || "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `TAKA-${String(highest + 1).padStart(4, "0")}`;
}
