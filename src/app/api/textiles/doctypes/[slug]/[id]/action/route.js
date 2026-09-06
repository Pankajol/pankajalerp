import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileDocument from "@/models/textiles/TextileDocument";
import { cleanTextileData, getTextileDoctype, nextDocumentNumber, userId } from "@/lib/textiles/doctypeServer";

async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  try { return await verifyJWT(token); } catch { return null; }
}

export async function POST(req, { params }) {
  await dbConnect();
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  const config = getTextileDoctype(slug);
  if (!config) return NextResponse.json({ success: false, message: "Unknown textile DocType" }, { status: 404 });
  const record = await TextileDocument.findOne({ _id: id, companyId: user.companyId, doctype: slug });
  if (!record) return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
  const body = await req.json();
  const action = (config.actions || []).find((item) => item.label === body.action);
  if (!action) return NextResponse.json({ success: false, message: "Action is not available" }, { status: 400 });

  let createdDocument = null;
  const previousStatus = record.status;
  if (action.status) record.status = action.status;
  if (action.create) {
    const target = getTextileDoctype(action.create);
    if (!target) return NextResponse.json({ success: false, message: "Action target is not configured" }, { status: 400 });
    const sourceData = record.data?.toObject ? record.data.toObject() : record.data || {};
    const copied = cleanTextileData(target, sourceData);
    createdDocument = await TextileDocument.create({
      companyId: user.companyId,
      doctype: action.create,
      documentNumber: await nextDocumentNumber(user.companyId, action.create, target.prefix),
      status: target.statuses?.[0] || "Draft",
      data: copied,
      createdBy: userId(user),
      updatedBy: userId(user),
    });
  }
  record.actionLog.push({ action: action.label, previousStatus, nextStatus: action.status || record.status, userId: userId(user), createdDocument: createdDocument?._id });
  record.updatedBy = userId(user);
  await record.save();
  return NextResponse.json({ success: true, data: record, created: createdDocument && { _id: createdDocument._id, doctype: createdDocument.doctype } });
}
