import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Counter from "@/models/Counter";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const SERIES = [
  { id: "customerCodeSeries", label: "Customer", prefix: "CUST" },
  { id: "supplierCodeSeries", label: "Supplier", prefix: "SUPP" },
  { id: "itemCodeSeries", label: "Item", prefix: "ITEM" },
  { id: "warehouseCodeSeries", label: "Warehouse", prefix: "WH" },
  { id: "employeeCodeSeries", label: "Employee", prefix: "EMP" },
  { id: "accountCodeSeries", label: "Account Head", prefix: "ACC" },
];

async function userFor(req) { return verifyJWT(getTokenFromHeader(req)); }

export async function GET(req) {
  await dbConnect();
  const user = await userFor(req);
  if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const counters = await Counter.find({ companyId: user.companyId, id: { $in: SERIES.map(s => s.id) } }).lean();
  const byId = new Map(counters.map(counter => [counter.id, counter]));
  return NextResponse.json({ success: true, data: SERIES.map(series => {
    const counter = byId.get(series.id);
    return { ...series, prefix: counter?.prefix || series.prefix, nextNumber: Number(counter?.seq || 0) + 1 };
  }) });
}

export async function PUT(req) {
  await dbConnect();
  const user = await userFor(req);
  if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { series } = await req.json();
  if (!Array.isArray(series)) return NextResponse.json({ success: false, message: "Series list is required" }, { status: 400 });
  for (const entry of series) {
    if (!SERIES.some(item => item.id === entry.id)) continue;
    const prefix = String(entry.prefix || "").trim().toUpperCase();
    const nextNumber = Number(entry.nextNumber);
    if (!/^[A-Z][A-Z0-9_-]{0,19}$/.test(prefix) || !Number.isInteger(nextNumber) || nextNumber < 1) {
      return NextResponse.json({ success: false, message: `Invalid series settings for ${entry.label || entry.id}` }, { status: 400 });
    }
    await Counter.findOneAndUpdate(
      { companyId: user.companyId, id: entry.id },
      { $set: { prefix }, $max: { seq: nextNumber - 1 } },
      { upsert: true, new: true }
    );
  }
  return GET(req);
}
