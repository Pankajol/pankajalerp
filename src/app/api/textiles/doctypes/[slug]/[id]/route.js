import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileDocument from "@/models/textiles/TextileDocument";
import { cleanTextileData, getTextileDoctype, missingRequiredFields, userId } from "@/lib/textiles/doctypeServer";
import { getStatusOptions } from "@/lib/textiles/doctypeConfig";

async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  try { return await verifyJWT(token); } catch { return null; }
}

export async function GET(req, { params }) {
  await dbConnect();
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  if (!getTextileDoctype(slug)) return NextResponse.json({ success: false, message: "Unknown textile DocType" }, { status: 404 });
  const record = await TextileDocument.findOne({ _id: id, companyId: user.companyId, doctype: slug }).lean();
  if (!record) return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: record });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  const config = getTextileDoctype(slug);
  if (!config) return NextResponse.json({ success: false, message: "Unknown textile DocType" }, { status: 404 });
  const body = await req.json();
  const data = cleanTextileData(config, body.data || body);
  const missing = missingRequiredFields(config, data);
  if (missing.length) return NextResponse.json({ success: false, message: `Required: ${missing.join(", ")}` }, { status: 400 });
  const update = { data, updatedBy: userId(user) };
  if (body.status && getStatusOptions(config).includes(body.status)) update.status = body.status;
  const record = await TextileDocument.findOneAndUpdate(
    { _id: id, companyId: user.companyId, doctype: slug },
    update,
    { new: true, runValidators: true }
  );
  if (!record) return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: record });
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  const record = await TextileDocument.findOne({ _id: id, companyId: user.companyId, doctype: slug });
  if (!record) return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
  if (record.status !== "Draft" && record.status !== "Cancelled") {
    return NextResponse.json({ success: false, message: "Only Draft or Cancelled records can be deleted" }, { status: 409 });
  }
  await record.deleteOne();
  return NextResponse.json({ success: true });
}
