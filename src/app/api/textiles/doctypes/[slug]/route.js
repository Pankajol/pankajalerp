import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileDocument from "@/models/textiles/TextileDocument";
import {
  cleanTextileData,
  getTextileDoctype,
  missingRequiredFields,
  nextDocumentNumber,
  userId,
} from "@/lib/textiles/doctypeServer";
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
  const { slug } = await params;
  const config = getTextileDoctype(slug);
  if (!config) return NextResponse.json({ success: false, message: "Unknown textile DocType" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status")?.trim();
  const query = { companyId: user.companyId, doctype: slug };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { documentNumber: { $regex: search, $options: "i" } },
      { "data.name": { $regex: search, $options: "i" } },
    ];
  }
  const records = await TextileDocument.find(query).sort({ updatedAt: -1 }).limit(500).lean();
  return NextResponse.json({ success: true, data: records, config: { label: config.label } });
}

export async function POST(req, { params }) {
  await dbConnect();
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const config = getTextileDoctype(slug);
  if (!config) return NextResponse.json({ success: false, message: "Unknown textile DocType" }, { status: 404 });

  const body = await req.json();
  const data = cleanTextileData(config, body.data || body);
  const missing = missingRequiredFields(config, data);
  if (missing.length) return NextResponse.json({ success: false, message: `Required: ${missing.join(", ")}` }, { status: 400 });

  const documentNumber = body.documentNumber?.trim() || await nextDocumentNumber(user.companyId, slug, config.prefix);
  const record = await TextileDocument.create({
    companyId: user.companyId,
    doctype: slug,
    documentNumber,
    status: getStatusOptions(config).includes(body.status) ? body.status : getStatusOptions(config)[0],
    data,
    createdBy: userId(user),
    updatedBy: userId(user),
  });
  return NextResponse.json({ success: true, data: record }, { status: 201 });
}
