const warehouseColumns = [
  ["warehouseCode", "Warehouse Code"],
  ["warehouseName", "Warehouse Name"],
  ["account", "Account"],
  ["company", "Company"],
  ["phoneNo", "Phone No"],
  ["mobileNo", "Mobile No"],
  ["email", "Email"],
  ["addressLine1", "Address Line 1"],
  ["addressLine2", "Address Line 2"],
  ["city", "City"],
  ["state", "State"],
  ["pin", "PIN Code"],
  ["country", "Country"],
  ["warehouseType", "Warehouse Type"],
  ["defaultInTransit", "Default In Transit"],
  ["isDefault", "Is Default"],
  ["status", "Status"],
  ["managerName", "Manager Name"],
  ["notes", "Notes"],
];

const binColumns = [
  ["warehouseCode", "Warehouse Code"],
  ["code", "Bin Code"],
  ["aisle", "Aisle"],
  ["rack", "Rack"],
  ["bin", "Bin"],
  ["maxCapacity", "Max Capacity"],
  ["currentStock", "Current Stock"],
  ["description", "Description"],
  ["status", "Status"],
];

const normalizeHeader = (value) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const text = (value) => String(value ?? "").trim();
const booleanValue = (value) =>
  ["true", "yes", "y", "1"].includes(text(value).toLowerCase());

function mapSheetRows(XLSX, sheet, columns) {
  if (!sheet) return [];
  const aliases = new Map(
    columns.flatMap(([key, label]) => [
      [normalizeHeader(key), key],
      [normalizeHeader(label), key],
    ])
  );
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }).map(
    (raw, index) => {
      const row = { _excelRow: Number(raw.__rowNum__ ?? index + 1) + 1 };
      for (const [header, value] of Object.entries(raw)) {
        const key = aliases.get(normalizeHeader(header));
        if (key) row[key] = value;
      }
      return row;
    }
  );
}

function makeSheet(XLSX, columns, rows = []) {
  const sheet = XLSX.utils.aoa_to_sheet([
    columns.map(([, label]) => label),
    ...rows.map((row) => columns.map(([key]) => row[key] ?? "")),
  ]);
  sheet["!cols"] = columns.map(([, label]) => ({
    wch: Math.min(35, Math.max(14, label.length + 3)),
  }));
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  return sheet;
}

export async function downloadWarehouseTemplate() {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    makeSheet(XLSX, warehouseColumns),
    "Warehouses"
  );
  XLSX.utils.book_append_sheet(workbook, makeSheet(XLSX, binColumns), "Bins");
  const instructions = XLSX.utils.aoa_to_sheet([
    ["Warehouse Import Template"],
    ["Instructions", "Enter one warehouse per row. Warehouse Code identifies records for create/update."],
    ["Bins", "Optional: add bin rows in the Bins sheet and repeat their Warehouse Code."],
    ["Required", "Warehouse Code, Warehouse Name, Account, Company, Phone No, Address Line 1, City, State, PIN Code and Country."],
    ["Warehouse Type", "Main | Transit | Cold Storage | Bonded | Distribution"],
    ["Status", "Active | Inactive | Under Maintenance"],
    ["Boolean values", "Use Yes/No or True/False for Default In Transit and Is Default."],
    ["Default rule", "Only one warehouse may be marked Is Default=Yes in one upload."],
  ]);
  instructions["!cols"] = [{ wch: 24 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  XLSX.writeFile(workbook, "warehouse-import-template.xlsx");
}

export async function parseWarehouseWorkbook(file) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });
  const warehouseSheet =
    workbook.Sheets.Warehouses || workbook.Sheets[workbook.SheetNames[0]];
  if (!warehouseSheet) throw new Error("Workbook does not contain a Warehouses sheet");
  const rows = mapSheetRows(XLSX, warehouseSheet, warehouseColumns).filter(
    (row) => warehouseColumns.some(([key]) => text(row[key]))
  );
  if (!rows.length) throw new Error("Warehouses sheet is empty");

  const bins = mapSheetRows(XLSX, workbook.Sheets.Bins, binColumns).filter(
    (row) => text(row.warehouseCode) || text(row.code)
  );
  const binsByWarehouse = new Map();
  for (const bin of bins) {
    const code = text(bin.warehouseCode).toUpperCase();
    if (!code) throw new Error(`Bins row ${bin._excelRow}: Warehouse Code is required`);
    const parsed = {
      ...bin,
      maxCapacity: text(bin.maxCapacity) ? Number(bin.maxCapacity) : 0,
      currentStock: text(bin.currentStock) ? Number(bin.currentStock) : 0,
    };
    (binsByWarehouse.get(code) || binsByWarehouse.set(code, []).get(code)).push(parsed);
  }

  return rows.map((row) => {
    const warehouseCode = text(row.warehouseCode).toUpperCase();
    return {
      ...row,
      warehouseCode,
      phoneNo: text(row.phoneNo),
      mobileNo: text(row.mobileNo),
      pin: text(row.pin),
      defaultInTransit: booleanValue(row.defaultInTransit),
      isDefault: booleanValue(row.isDefault),
      ...(binsByWarehouse.has(warehouseCode)
        ? { binLocations: binsByWarehouse.get(warehouseCode) }
        : {}),
    };
  });
}

export async function downloadWarehouseData(warehouses = []) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    makeSheet(XLSX, warehouseColumns, warehouses),
    "Warehouses"
  );
  const bins = warehouses.flatMap((warehouse) =>
    (warehouse.binLocations || []).map((bin) => ({
      ...bin,
      warehouseCode: warehouse.warehouseCode,
    }))
  );
  XLSX.utils.book_append_sheet(
    workbook,
    makeSheet(XLSX, binColumns, bins),
    "Bins"
  );
  XLSX.writeFile(workbook, "warehouse-data.xlsx");
}

