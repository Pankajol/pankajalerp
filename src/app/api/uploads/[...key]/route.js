import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { storeAttachment, fileStorageProvider } from "@/lib/fileStorage";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const form = await req.formData();
    const files = form.getAll("files").filter((file) => file?.size);
    if (!files.length) return NextResponse.json({ success: false, message: "Select at least one file" }, { status: 400 });
    if (files.length > 10) return NextResponse.json({ success: false, message: "A maximum of 10 files can be uploaded at once" }, { status: 400 });
    const folder = form.get("folder") || "attachments";
    const filesStored = await Promise.all(files.map((file) => storeAttachment(file, { companyId: user.companyId, folder })));
    return NextResponse.json({ success: true, provider: fileStorageProvider(), files: filesStored }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function GET(req, { params }) {
  try {
    const user = verifyJWT(getTokenFromHeader(req));
    const { key } = await params;
    if (!user?.companyId || !Array.isArray(key) || key.length < 3 || key.some((part) => part.includes(".."))) {
      return new NextResponse("Not found", { status: 404 });
    }
    // First path segment is the folder and second is the tenant company id.
    // Legacy transaction routes do not pass a company id to the uploader and
    // are stored in the compatibility "public" tenant. New shared uploads
    // are always restricted to their actual company id.
    if (key[1] !== "public" && key[1] !== String(user.companyId)) return new NextResponse("Forbidden", { status: 403 });
    const buffer = await readFile(path.join(process.cwd(), "uploads", ...key));
    return new NextResponse(buffer, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
