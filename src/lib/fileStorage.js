import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const SAFE_NAME = /[^a-zA-Z0-9._-]/g;

function configuredProvider() {
  const setting = String(process.env.FILE_STORAGE_PROVIDER || "auto").toLowerCase();
  const cloudReady = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (setting === "cloudinary" && !cloudReady) throw new Error("Cloudinary is selected but its credentials are incomplete");
  return setting === "auto" ? (cloudReady ? "cloudinary" : "local") : setting;
}

function safePart(value, fallback) {
  return String(value || fallback).replace(SAFE_NAME, "-").replace(/-+/g, "-").slice(0, 100);
}

async function uploadToCloudinary(buffer, name, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto", public_id: `${Date.now()}-${safePart(name, "file")}` }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id, provider: "cloudinary", name, size: buffer.length, mimeType: result.resource_type });
    });
    stream.end(buffer);
  });
}

/** Upload a browser File, a formidable file buffer, or any Buffer. */
export async function storeAttachment(file, { companyId, folder = "attachments" } = {}) {
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  if (!buffer.length) throw new Error("Cannot upload an empty file");
  if (buffer.length > MAX_FILE_SIZE) throw new Error("Attachment exceeds the 15 MB limit");
  const name = safePart(file.name || file.originalFilename || "file", "file");
  const relativeFolder = `${safePart(folder, "attachments")}/${safePart(companyId, "public")}`;
  if (configuredProvider() === "cloudinary") return uploadToCloudinary(buffer, name, relativeFolder);

  const filename = `${Date.now()}-${randomUUID()}-${name}`;
  const diskFolder = path.join(process.cwd(), "uploads", relativeFolder);
  await mkdir(diskFolder, { recursive: true });
  await writeFile(path.join(diskFolder, filename), buffer);
  return { url: `/api/uploads/${relativeFolder}/${filename}`, storageKey: `${relativeFolder}/${filename}`, provider: "local", name, size: buffer.length, mimeType: file.type || file.mimetype || "application/octet-stream" };
}

export async function removeAttachment(attachment) {
  if (!attachment) return;
  if (attachment.provider === "cloudinary" && attachment.publicId) {
    await cloudinary.uploader.destroy(attachment.publicId, { resource_type: "raw" }).catch(() => null);
  }
  if (attachment.provider === "local" && attachment.storageKey && !attachment.storageKey.includes("..")) {
    await unlink(path.join(process.cwd(), "uploads", attachment.storageKey)).catch(() => null);
  }
}

export const fileStorageProvider = configuredProvider;
