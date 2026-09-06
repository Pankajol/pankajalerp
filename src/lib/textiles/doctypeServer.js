import TextileDocument from "@/models/textiles/TextileDocument";
import { textileDoctypes } from "@/lib/textiles/doctypeConfig";

export function getTextileDoctype(slug) {
  return textileDoctypes[slug] || null;
}

export function cleanTextileData(config, input = {}) {
  const result = {};
  for (const field of config.fields) {
    let value = input[field.name];
    if (field.type === "checkbox") {
      if (value === undefined || value === null || value === "") {
        value = field.default !== undefined ? Boolean(field.default) : false;
      } else if (typeof value === "string") {
        value = ["true", "yes", "1", "y"].includes(
          value.trim().toLowerCase()
        );
      } else {
        value = Boolean(value);
      }
    }
    if (["number", "currency"].includes(field.type)) {
      value = value === "" || value === null || value === undefined ? null : Number(value);
      if (value !== null && !Number.isFinite(value)) value = null;
    }
    if (field.type === "table") {
      value = Array.isArray(value)
        ? value.map((row) => cleanTextileData({ fields: field.columns }, row))
        : [];
    }
    if (value !== undefined) result[field.name] = value;
  }
  return result;
}

export function missingRequiredFields(config, data) {
  const missing = [];
  for (const field of config.fields) {
    const value = data[field.name];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (field.required && empty) missing.push(field.label);
    if (field.type === "table" && Array.isArray(value)) {
      value.forEach((child, index) => {
        const childMissing = missingRequiredFields(
          { fields: field.columns || [] },
          child || {}
        );
        missing.push(
          ...childMissing.map(
            (label) => `${field.label} row ${index + 1}: ${label}`
          )
        );
      });
    }
  }
  return missing;
}

export async function nextDocumentNumber(companyId, slug, prefix) {
  const latest = await TextileDocument.findOne({ companyId, doctype: slug })
    .sort({ createdAt: -1 })
    .select("documentNumber")
    .lean();
  const previous = Number(String(latest?.documentNumber || "").match(/(\d+)$/)?.[1] || 0);
  return `${prefix}-${String(previous + 1).padStart(5, "0")}`;
}

export function userId(user) {
  return String(user.id || user._id || "");
}
