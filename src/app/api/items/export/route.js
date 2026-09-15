import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const EXPORT_COLUMNS = [
  ["Item Code", "itemCode"],
  ["Item Name", "itemName"],
  ["Category", "category"],
  ["Item Group", "itemGroup"],
  ["Item Type", "itemType"],
  ["Unit Price", "unitPrice"],
  ["Sales Price", "salesPrice"],
  ["MRP", "mrp"],
  ["Quantity", "quantity"],
  ["Stock Quantity", "stockQuantity"],
  ["Reorder Level", "reorderLevel"],
  ["UOM", "uom"],
  ["Stock UOM", "stockUom"],
  ["Brand", "brand"],
  ["Manufacturer", "manufacturer"],
  ["HSN Code", "hsnCode"],
  ["Default Warehouse", "defaultWarehouse"],
  ["GST Rate", "gstRate"],
  ["CGST Rate", "cgstRate"],
  ["SGST Rate", "sgstRate"],
  ["IGST Rate", "igstRate"],
  ["Status", "status"],
  ["Textile Item", "isTextile"],
  ["Textile Item Type", "textileItemType"],
  ["Stock Item", "isStockItem"],
  ["Batch Required", "batchRequired"],
  ["Has Variants", "hasVariants"],
  ["Variant Count", "variantCount"],
  ["POS Enabled", "posEnabled"],
  ["Created At", "createdAt"],
];

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const csvCell = (value) => {
  let normalized = value ?? "";
  if (normalized instanceof Date) normalized = normalized.toISOString();
  if (typeof normalized === "boolean") normalized = normalized ? "Yes" : "No";
  normalized = String(normalized);

  // Prevent spreadsheet applications from evaluating item text as a formula.
  if (/^[=+@]/.test(normalized) || /^-\D/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  return `"${normalized.replaceAll('"', '""')}"`;
};

export async function GET(req) {
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user?.companyId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const itemType = searchParams.get("itemType")?.trim() || "";
    const query = { companyId: user.companyId };

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { itemName: { $regex: safeSearch, $options: "i" } },
        { itemCode: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (itemType && itemType !== "All") query.itemType = itemType;

    const fields = EXPORT_COLUMNS
      .map(([, key]) => key)
      .filter((key) => key !== "variantCount")
      .join(" ");
    const items = await Item.find(query)
      .select(`${fields} variants`)
      .sort({ createdAt: -1 })
      .lean();

    const rows = items.map((item) => ({
      ...item,
      variantCount: Array.isArray(item.variants) ? item.variants.length : 0,
    }));
    const csv = [
      EXPORT_COLUMNS.map(([label]) => label),
      ...rows.map((item) => EXPORT_COLUMNS.map(([, key]) => item[key])),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="items_${date}.csv"`,
        "Cache-Control": "no-store",
        "X-Exported-Count": String(items.length),
      },
    });
  } catch (error) {
    console.error("Item export error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to download items" },
      { status: 500 }
    );
  }
}
