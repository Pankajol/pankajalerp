import mongoose from "mongoose";
import Company from "@/models/Company";

/** Resolve the company used by a public storefront without exposing private data. */
export async function resolveStoreCompany(identifier) {
  const value = String(identifier || "").trim().toLowerCase();
  if (!value) return null;

  if (mongoose.Types.ObjectId.isValid(value)) {
    return Company.findById(value).select("_id companyName slug isActive").lean();
  }

  return Company.findOne({ slug: value }).select("_id companyName slug isActive").lean();
}

