import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Warehouse from "@/models/warehouseModels";

const WAREHOUSE_TYPES = new Set([
  "Main",
  "Transit",
  "Cold Storage",
  "Bonded",
  "Distribution",
]);
const STATUSES = new Set(["Active", "Inactive", "Under Maintenance"]);
const BIN_STATUSES = new Set(["Active", "Inactive"]);
const text = (value) => String(value ?? "").trim();
const booleanValue = (value) =>
  typeof value === "boolean"
    ? value
    : ["true", "yes", "y", "1"].includes(text(value).toLowerCase());

function validateRow(row, index) {
  const rowNumber = Number(row._excelRow) || index + 2;
  const errors = [];
  const required = [
    ["warehouseCode", "Warehouse Code"],
    ["warehouseName", "Warehouse Name"],
    ["account", "Account"],
    ["company", "Company"],
    ["phoneNo", "Phone No"],
    ["addressLine1", "Address Line 1"],
    ["city", "City"],
    ["state", "State"],
    ["pin", "PIN Code"],
    ["country", "Country"],
  ];
  for (const [key, label] of required) {
    if (!text(row[key])) errors.push(`${label} is required`);
  }
  if (text(row.phoneNo) && !/^\d{10}$/.test(text(row.phoneNo)))
    errors.push("Phone No must contain 10 digits");
  if (text(row.mobileNo) && !/^\d{10}$/.test(text(row.mobileNo)))
    errors.push("Mobile No must contain 10 digits");
  if (text(row.pin) && !/^\d{6}$/.test(text(row.pin)))
    errors.push("PIN Code must contain 6 digits");
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(row.email)))
    errors.push("Email is invalid");

  const warehouseType = text(row.warehouseType) || "Main";
  const status = text(row.status) || "Active";
  if (!WAREHOUSE_TYPES.has(warehouseType)) errors.push(`Invalid Warehouse Type: ${warehouseType}`);
  if (!STATUSES.has(status)) errors.push(`Invalid Status: ${status}`);

  const binCodes = new Set();
  for (const [binIndex, bin] of (row.binLocations || []).entries()) {
    const binLabel = `Bin row ${Number(bin._excelRow) || binIndex + 2}`;
    const code = text(bin.code).toUpperCase();
    if (!code) errors.push(`${binLabel}: Bin Code is required`);
    if (code && binCodes.has(code)) errors.push(`${binLabel}: Duplicate Bin Code ${code}`);
    if (code) binCodes.add(code);
    if (bin.status && !BIN_STATUSES.has(text(bin.status)))
      errors.push(`${binLabel}: Invalid Status ${bin.status}`);
    if (!Number.isFinite(Number(bin.maxCapacity)) || Number(bin.maxCapacity) < 0)
      errors.push(`${binLabel}: Max Capacity must be zero or greater`);
    if (!Number.isFinite(Number(bin.currentStock)) || Number(bin.currentStock) < 0)
      errors.push(`${binLabel}: Current Stock must be zero or greater`);
  }
  return errors.map((message) => ({ row: rowNumber, message }));
}

function cleanRow(row) {
  const result = {
    warehouseCode: text(row.warehouseCode).toUpperCase(),
    warehouseName: text(row.warehouseName),
    account: text(row.account),
    company: text(row.company),
    phoneNo: text(row.phoneNo),
    mobileNo: text(row.mobileNo),
    email: text(row.email),
    addressLine1: text(row.addressLine1),
    addressLine2: text(row.addressLine2),
    city: text(row.city),
    state: text(row.state),
    pin: text(row.pin),
    country: text(row.country) || "India",
    warehouseType: text(row.warehouseType) || "Main",
    defaultInTransit: booleanValue(row.defaultInTransit),
    isDefault: booleanValue(row.isDefault),
    status: text(row.status) || "Active",
    managerName: text(row.managerName),
    notes: text(row.notes),
  };
  if (Array.isArray(row.binLocations)) {
    result.binLocations = row.binLocations.map((bin) => ({
      code: text(bin.code).toUpperCase(),
      aisle: text(bin.aisle),
      rack: text(bin.rack),
      bin: text(bin.bin),
      maxCapacity: Number(bin.maxCapacity) || 0,
      currentStock: Number(bin.currentStock) || 0,
      description: text(bin.description),
      status: text(bin.status) || "Active",
    }));
  }
  return result;
}

export async function POST(req) {
  await dbConnect();
  let user;
  try {
    user = verifyJWT(getTokenFromHeader(req));
  } catch {
    user = null;
  }
  if (!user?.companyId)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length)
    return NextResponse.json({ success: false, error: "Upload has no warehouse rows" }, { status: 400 });
  if (rows.length > 1000)
    return NextResponse.json({ success: false, error: "Maximum 1000 warehouses per upload" }, { status: 400 });

  const errors = rows.flatMap(validateRow);
  const codes = rows.map((row) => text(row.warehouseCode).toUpperCase());
  const duplicateCodes = [...new Set(codes.filter((code, index) => code && codes.indexOf(code) !== index))];
  if (duplicateCodes.length)
    errors.push({ row: 0, message: `Duplicate Warehouse Codes: ${duplicateCodes.join(", ")}` });
  if (rows.filter((row) => booleanValue(row.isDefault)).length > 1)
    errors.push({ row: 0, message: "Only one warehouse can be marked as default" });
  if (errors.length)
    return NextResponse.json({ success: false, error: "Import validation failed", errors }, { status: 400 });

  const existing = await Warehouse.find({
    companyId: user.companyId,
    warehouseCode: { $in: codes },
  }).select("warehouseCode").lean();
  const existingCodes = new Set(existing.map((item) => item.warehouseCode));
  const cleaned = rows.map(cleanRow);

  const operations = cleaned.map((row) => {
    const { binLocations, ...fields } = row;
    const update = { ...fields, updatedAt: new Date() };
    if (binLocations) update.binLocations = binLocations;
    return {
      updateOne: {
        filter: { companyId: user.companyId, warehouseCode: row.warehouseCode },
        update: {
          $set: update,
          $setOnInsert: { companyId: user.companyId, createdBy: user.id },
        },
        upsert: true,
      },
    };
  });

  try {
    await Warehouse.bulkWrite(operations, { ordered: true });
    const uploadedDefault = cleaned.find((row) => row.isDefault);
    if (uploadedDefault) {
      await Warehouse.updateMany(
        {
          companyId: user.companyId,
          warehouseCode: { $ne: uploadedDefault.warehouseCode },
        },
        { $set: { isDefault: false } }
      );
    }
    const updated = cleaned.filter((row) => existingCodes.has(row.warehouseCode)).length;
    return NextResponse.json({
      success: true,
      created: cleaned.length - updated,
      updated,
      total: cleaned.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error?.code === 11000 ? "Duplicate warehouse code" : error.message },
      { status: error?.code === 11000 ? 409 : 500 }
    );
  }
}
