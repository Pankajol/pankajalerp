import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileDocument from "@/models/textiles/TextileDocument";
import DyeingRecipe from "@/models/textiles/DyeingRecipe";
import QCInspection from "@/models/textiles/QCInspection";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import Costing from "@/models/textiles/Costing";

const CANONICAL_MODELS = {
  "dyeing-recipe": { model: DyeingRecipe, name: "DyeingRecipe" },
  "fabric-inspection": { model: QCInspection, name: "QCInspection" },
  "job-work-receipt": { model: JobWorkReceipt, name: "JobWorkReceipt" },
  "production-cost-sheet": { model: Costing, name: "Costing" },
};

export async function POST(req, { params }) {
  await dbConnect();
  let user;
  try { user = verifyJWT(getTokenFromHeader(req)); } catch { user = null; }
  if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  const definition = CANONICAL_MODELS[slug];
  if (!definition) return NextResponse.json({ success: false, message: "This DocType has no canonical migration target" }, { status: 400 });
  const { recordId } = await req.json();
  if (!mongoose.Types.ObjectId.isValid(recordId)) return NextResponse.json({ success: false, message: "A valid canonical record ID is required" }, { status: 400 });
  const [legacy, canonical] = await Promise.all([
    TextileDocument.findOne({ _id: id, companyId: user.companyId, doctype: slug }),
    definition.model.findOne({ _id: recordId, companyId: user.companyId }).select("_id").lean(),
  ]);
  if (!legacy || !canonical) return NextResponse.json({ success: false, message: "Legacy or canonical record was not found in this company" }, { status: 404 });
  legacy.canonicalReference = { model: definition.name, recordId: canonical._id, linkedAt: new Date(), linkedBy: String(user.id || user._id || "") };
  await legacy.save();
  return NextResponse.json({ success: true, data: legacy.canonicalReference, message: "Legacy record linked. No stock, costing, or accounting data was copied." });
}
