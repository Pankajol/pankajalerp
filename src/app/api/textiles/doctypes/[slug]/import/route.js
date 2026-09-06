import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Item from "@/models/ItemModels";
import TextileDocument from "@/models/textiles/TextileDocument";
import { cleanTextileData, getTextileDoctype, missingRequiredFields, userId } from "@/lib/textiles/doctypeServer";
import { getStatusOptions } from "@/lib/textiles/doctypeConfig";

const itemLinkTypes = new Set(["Item", "Item / Fiber Master"]);
const clean = (value) => String(value ?? "").trim();

async function resolveItemLinks(config, rows, companyId) {
  const locations = [];
  rows.forEach((row, rowIndex) => {
    config.fields.forEach((field) => {
      if (field.type === "link" && itemLinkTypes.has(field.link)) {
        locations.push({ row, rowIndex, field, holder: row });
      }
      if (field.type === "table" && Array.isArray(row[field.name])) {
        row[field.name].forEach((child) => {
          field.columns.forEach((column) => {
            if (column.type === "link" && itemLinkTypes.has(column.link)) {
              locations.push({
                row,
                rowIndex,
                field: column,
                holder: child,
              });
            }
          });
        });
      }
    });
  });

  const values = [
    ...new Set(
      locations
        .map(({ field, holder }) => clean(holder[field.name]?._id || holder[field.name]))
        .filter(Boolean)
    ),
  ];
  if (!values.length) return [];

  const objectIds = values.filter((value) => /^[a-f\d]{24}$/i.test(value));
  const clauses = [
    { itemCode: { $in: values } },
    { itemName: { $in: values } },
  ];
  if (objectIds.length) clauses.push({ _id: { $in: objectIds } });
  const items = await Item.find({ companyId, $or: clauses })
    .collation({ locale: "en", strength: 2 })
    .select("_id itemCode itemName")
    .lean();
  const itemIds = new Map();
  items.forEach((item) => {
    itemIds.set(String(item._id).toLowerCase(), String(item._id));
    if (item.itemCode) {
      itemIds.set(String(item.itemCode).trim().toLowerCase(), String(item._id));
    }
    if (item.itemName) {
      const key = String(item.itemName).trim().toLowerCase();
      if (!itemIds.has(key)) itemIds.set(key, String(item._id));
    }
  });

  const errors = [];
  locations.forEach(({ rowIndex, field, holder }) => {
    const original = clean(holder[field.name]?._id || holder[field.name]);
    if (!original) return;
    const itemId = itemIds.get(original.toLowerCase());
    if (itemId) holder[field.name] = itemId;
    else {
      errors.push({
        row: rowIndex + 2,
        message: `${field.label}: Item '${original}' was not found for this company`,
      });
    }
  });
  return errors;
}

export async function POST(req, { params }) {
  await dbConnect();
  let user;
  try { user = verifyJWT(getTokenFromHeader(req)); } catch { user = null; }
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const config = getTextileDoctype(slug);
  if (!config) return NextResponse.json({ success: false, message: "Unknown textile DocType" }, { status: 404 });
  const body = await req.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ success: false, message: "Excel file has no records" }, { status: 400 });
  if (rows.length > 1000) return NextResponse.json({ success: false, message: "Maximum 1000 records per upload" }, { status: 400 });

  const statuses = getStatusOptions(config);
  const errors = await resolveItemLinks(config, rows, user.companyId);
  const cleaned = rows.map((row, index) => {
    const data = cleanTextileData(config, row);
    const missing = missingRequiredFields(config, data);
    if (missing.length) errors.push({ row: index + 2, message: `Required: ${missing.join(", ")}` });
    if (row.status && !statuses.includes(row.status)) errors.push({ row: index + 2, message: `Invalid status: ${row.status}` });
    return { row, data };
  });
  if (errors.length) return NextResponse.json({ success: false, message: "Import validation failed", errors }, { status: 400 });

  const latest = await TextileDocument.findOne({ companyId: user.companyId, doctype: slug }).sort({ createdAt: -1 }).select("documentNumber").lean();
  let sequence = Number(String(latest?.documentNumber || "").match(/(\d+)$/)?.[1] || 0);
  const documents = cleaned.map(({ row, data }) => ({
    companyId: user.companyId, doctype: slug,
    documentNumber: String(row.documentNumber || "").trim() || `${config.prefix}-${String(++sequence).padStart(5, "0")}`,
    status: row.status || statuses[0], data, createdBy: userId(user), updatedBy: userId(user),
  }));
  const duplicates = documents.map((record) => record.documentNumber).filter((value, index, all) => all.indexOf(value) !== index);
  if (duplicates.length) return NextResponse.json({ success: false, message: `Duplicate document numbers: ${[...new Set(duplicates)].join(", ")}` }, { status: 400 });

  const existing = await TextileDocument.find({
    companyId: user.companyId, doctype: slug,
    documentNumber: { $in: documents.map((record) => record.documentNumber) },
  }).select("documentNumber").lean();
  if (existing.length) return NextResponse.json({ success: false, message: `Already exists: ${existing.map((record) => record.documentNumber).join(", ")}` }, { status: 409 });

  try {
    const inserted = await TextileDocument.insertMany(documents, { ordered: true });
    return NextResponse.json({ success: true, imported: inserted.length }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ success: false, message: "A document number already exists. Correct the Excel file and retry." }, { status: 409 });
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
