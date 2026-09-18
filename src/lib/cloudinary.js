import { v2 as cloudinary } from "cloudinary";
import { readFile } from "fs/promises";
import { Writable } from "stream";

const enabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (enabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Compatibility adapter for legacy transaction routes. It keeps those routes
// operational when Cloudinary is intentionally disabled. New routes should
// call fileStorage directly so that they can pass the tenant company id.
if (!enabled) {
  const localResult = async (buffer, options = {}) => {
    const { storeAttachment } = await import("@/lib/fileStorage");
    return storeAttachment(Object.assign(Buffer.from(buffer), { name: options.public_id || "attachment" }), { folder: options.folder || "attachments" });
  };
  cloudinary.uploader.upload = async (filePath, options = {}) => {
    const result = await localResult(await readFile(filePath), options);
    return { secure_url: result.url, public_id: result.storageKey, resource_type: "raw" };
  };
  cloudinary.uploader.upload_stream = (options, done) => {
    const chunks = [];
    return new Writable({
      write(chunk, _encoding, callback) { chunks.push(chunk); callback(); },
      final(callback) { localResult(Buffer.concat(chunks), options).then((result) => { done(null, { secure_url: result.url, public_id: result.storageKey, resource_type: "raw" }); callback(); }).catch((error) => { done(error); callback(error); }); },
    });
  };
  cloudinary.uploader.destroy = async () => ({ result: "not_found" });
}

export default cloudinary;
