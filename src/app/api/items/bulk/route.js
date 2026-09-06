import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Item from "@/models/ItemModels";
import ItemGroup from "@/models/ItemGroupModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clean = (value) => String(value ?? "").trim();

function numberValue(value, field, errors, { required = false, min = 0 } = {}) {
  const raw = clean(value);
  if (!raw) {
    if (required) errors.push(`${field} is required`);
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    errors.push(`${field} must be a number`);
    return 0;
  }
  if (parsed < min) errors.push(`${field} cannot be less than ${min}`);
  return parsed;
}

function optionalBoolean(value, field, errors) {
  const raw = clean(value).toLowerCase();
  if (!raw) return undefined;
  if (["true", "yes", "1", "y"].includes(raw)) return true;
  if (["false", "no", "0", "n"].includes(raw)) return false;
  errors.push(`${field} must be true/false, yes/no, or 1/0`);
  return undefined;
}

const textileNumberFields = [
  "count",
  "denier",
  "ply",
  "coneWeight",
  "gsm",
  "finishedWidth",
  "greyWidth",
  "concentration",
  "packingCapacity",
];

const textileTextFields = [
  "yarnType",
  "countSystem",
  "twist",
  "compositionTemplate",
  "fabricType",
  "construction",
  "widthUom",
  "finish",
  "design",
  "color",
  "shade",
  "chemicalType",
  "hazardClass",
  "storageInstructions",
  "packingType",
  "packingDimensions",
  "materialGrade",
];

async function nextItemCode(companyId) {
  const items = await Item.find({ companyId, itemCode: /^ITEM-\d+$/ })
    .select("itemCode")
    .lean();
  return (
    items.reduce((max, item) => {
      const number = Number(item.itemCode.split("-").pop());
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0) + 1
  );
}

async function ensureItemGroup(name, companyId, createdBy, cache) {
  const trimmedName = clean(name);
  if (!trimmedName) return { group: null, created: false };
  const cacheKey = trimmedName.toLowerCase();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const existing = await ItemGroup.findOne({
    companyId,
    name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: "i" },
  });
  if (existing) {
    const result = { group: existing, created: false };
    cache.set(cacheKey, result);
    return result;
  }

  const baseCode =
    trimmedName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20) || "GROUP";
  let suffix = 1;
  let group;
  while (!group) {
    const code = suffix === 1 ? baseCode : `${baseCode}-${suffix}`;
    if (!(await ItemGroup.exists({ code }))) {
      try {
        group = await ItemGroup.create({
          companyId,
          createdBy,
          name: trimmedName,
          code,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
    suffix += 1;
  }

  const result = { group, created: true };
  cache.set(cacheKey, result);
  return result;
}

export async function POST(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const companyId = user.companyId;
    const createdBy = user.id || user.userId || user._id;
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company could not be identified" },
        { status: 400 }
      );
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "The upload contains no item rows" },
        { status: 400 }
      );
    }
    if (items.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message: "A maximum of 5,000 rows can be uploaded at once",
        },
        { status: 400 }
      );
    }

    const results = [];
    const groupCache = new Map();
    const autoCreatedGroups = new Set();
    const uploadedCodes = new Set(
      items.map((row) => clean(row?.itemCode).toUpperCase()).filter(Boolean)
    );
    let codeNumber = await nextItemCode(companyId);
    let createdCount = 0;
    let updatedCount = 0;

    for (let index = 0; index < items.length; index += 1) {
      const rowNumber = index + 2;
      const row = items[index] || {};
      const errors = [];
      const warnings = [];
      const itemName = clean(row.itemName);
      const category = clean(row.category);
      const itemGroup = clean(row.itemGroup) || category;
      const itemCodeFromFile = clean(row.itemCode).toUpperCase();
      const unitPrice = numberValue(row.unitPrice, "unitPrice", errors, {
        required: true,
      });
      const optionalNumbers = {};
      for (const field of [
        "salesPrice",
        "mrp",
        "quantity",
        "stockQuantity",
        "reorderLevel",
        "leadTime",
        "gstRate",
        "cgstRate",
        "sgstRate",
        "igstRate",
      ]) {
        optionalNumbers[field] = numberValue(row[field], field, errors);
      }
      const quantity = optionalNumbers.quantity;
      const statusFromFile = clean(row.status).toLowerCase();
      const booleans = {};
      for (const field of [
        "includeGST",
        "includeIGST",
        "isStockItem",
        "inStock",
        "batchRequired",
        "hasVariants",
        "rollTrackingEnabled",
        "isTextile",
      ]) {
        booleans[field] = optionalBoolean(row[field], field, errors);
      }
      const isTextile = booleans.isTextile;
      const textileItemType = clean(row.textileItemType);
      const validTextileTypes = [
        "Raw Material",
        "Yarn",
        "Grey Fabric",
        "Dyed Fabric",
        "Finished Fabric",
        "Chemical",
        "Dye",
        "Packing",
        "Packing Material",
        "Trading Item",
        "Scrap",
      ];

      if (!itemName) errors.push("itemName is required");
      if (!category) errors.push("category is required");
      if (
        statusFromFile &&
        !["active", "inactive"].includes(statusFromFile)
      ) {
        errors.push("status must be active or inactive");
      }
      for (const field of ["gstRate", "cgstRate", "sgstRate", "igstRate"]) {
        if (optionalNumbers[field] > 100) {
          errors.push(`${field} cannot exceed 100`);
        }
      }
      if (
        textileItemType &&
        !validTextileTypes.includes(textileItemType)
      ) {
        errors.push(`invalid textileItemType: ${textileItemType}`);
      }

      if (errors.length) {
        results.push({ row: rowNumber, success: false, errors });
        continue;
      }

      try {
        const [nameMatch, codeMatch] = await Promise.all([
          Item.findOne({
            companyId,
            itemName: { $regex: `^${escapeRegex(itemName)}$`, $options: "i" },
          }),
          itemCodeFromFile
            ? Item.findOne({
                companyId,
                itemCode: {
                  $regex: `^${escapeRegex(itemCodeFromFile)}$`,
                  $options: "i",
                },
              })
            : null,
        ]);
        if (
          nameMatch &&
          codeMatch &&
          String(nameMatch._id) !== String(codeMatch._id)
        ) {
          throw new Error(
            "itemName and itemCode belong to different existing items"
          );
        }
        const existingItem = codeMatch || nameMatch;

        const effectiveIsTextile =
          isTextile ?? existingItem?.isTextile ?? false;
        const effectiveTextileType =
          textileItemType || existingItem?.textileItemType || "";
        if (effectiveIsTextile && !effectiveTextileType) {
          results.push({
            row: rowNumber,
            success: false,
            errors: [
              "textileItemType is required when isTextile is true",
            ],
          });
          continue;
        }

        const uomFromFile = clean(row.uom);
        const unitFromFile = clean(row.unit);
        const uom =
          uomFromFile || unitFromFile || existingItem?.uom || "NOS";
        const status = statusFromFile || existingItem?.status || "active";
        const textileDetails = {};
        for (const field of textileTextFields) {
          const value = clean(row[field]);
          if (value) textileDetails[field] = value;
        }
        for (const field of textileNumberFields) {
          const value = numberValue(row[field], field, errors);
          if (value !== undefined) textileDetails[field] = value;
        }
        if (errors.length) {
          results.push({ row: rowNumber, success: false, errors });
          continue;
        }

        for (const groupName of [...new Set([category, itemGroup])]) {
          const ensured = await ensureItemGroup(
            groupName,
            companyId,
            createdBy,
            groupCache
          );
          if (ensured.created) {
            autoCreatedGroups.add(ensured.group.name);
            warnings.push(`Item group '${ensured.group.name}' was created`);
          }
        }

        const itemData = {
          companyId,
          itemName,
          category,
          itemGroup,
          itemType: clean(row.itemType) || existingItem?.itemType || "Product",
          unitPrice,
          uom,
          unit: unitFromFile || existingItem?.unit || uom,
          status,
          active: status === "active",
          isTextile: effectiveIsTextile,
          textileItemType:
            isTextile === false && !textileItemType
              ? ""
              : effectiveTextileType,
          stockUom:
            clean(row.stockUom) || existingItem?.stockUom || uom,
        };
        for (const field of [
          "hsnCode",
          "description",
          "imageUrl",
          "brand",
          "defaultWarehouse",
          "manufacturer",
        ]) {
          const value = clean(row[field]);
          if (value) itemData[field] = value;
        }
        for (const [field, value] of Object.entries(optionalNumbers)) {
          if (value !== undefined) itemData[field] = value;
        }
        if (quantity === undefined && !existingItem) itemData.quantity = 0;
        for (const [field, value] of Object.entries(booleans)) {
          if (value !== undefined) itemData[field] = value;
        }
        if (clean(row.tags)) {
          itemData.tags = clean(row.tags)
            .split(/[;,]/)
            .map(clean)
            .filter(Boolean);
        }
        if (Object.keys(textileDetails).length) {
          itemData.textileDetails = existingItem
            ? {
                ...(existingItem.textileDetails?.toObject?.() ||
                  existingItem.textileDetails || {}),
                ...textileDetails,
              }
            : textileDetails;
        }

        if (existingItem) {
          Object.assign(existingItem, itemData);
          await existingItem.save();
          updatedCount += 1;
          results.push({
            row: rowNumber,
            success: true,
            action: "updated",
            itemCode: existingItem.itemCode,
            itemName,
            warnings,
          });
        } else {
          let itemCode = itemCodeFromFile;
          if (!itemCode) {
            itemCode = `ITEM-${String(codeNumber).padStart(4, "0")}`;
            while (
              uploadedCodes.has(itemCode) ||
              (await Item.exists({ companyId, itemCode }))
            ) {
              codeNumber += 1;
              itemCode = `ITEM-${String(codeNumber).padStart(4, "0")}`;
            }
            codeNumber += 1;
          }
          const created = await Item.create({
            ...itemData,
            itemCode,
            createdBy,
          });
          createdCount += 1;
          results.push({
            row: rowNumber,
            success: true,
            action: "created",
            itemCode: created.itemCode,
            itemName,
            warnings,
          });
        }
      } catch (error) {
        const message =
          error?.code === 11000
            ? "itemCode already exists"
            : error.message || "Row could not be saved";
        results.push({ row: rowNumber, success: false, errors: [message] });
      }
    }

    const failedCount = results.filter((result) => !result.success).length;
    const success = createdCount + updatedCount > 0;
    return NextResponse.json({
      success,
      message: success
        ? `Import complete: ${createdCount} created, ${updatedCount} updated, ${failedCount} failed`
        : `Import failed: all ${failedCount} rows contain errors`,
      summary: {
        total: items.length,
        created: createdCount,
        updated: updatedCount,
        failed: failedCount,
        groupsCreated: autoCreatedGroups.size,
      },
      autoCreatedGroups: [...autoCreatedGroups],
      results,
    });
  } catch (error) {
    console.error("Item Bulk Upload Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Item import failed" },
      { status: 500 }
    );
  }
}
