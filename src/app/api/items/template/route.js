import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const columns = [
  "itemCode",
  "itemName",
  "category",
  "itemGroup",
  "itemType",
  "unitPrice",
  "salesPrice",
  "mrp",
  "quantity",
  "stockQuantity",
  "reorderLevel",
  "leadTime",
  "unit",
  "uom",
  "stockUom",
  "brand",
  "hsnCode",
  "defaultWarehouse",
  "manufacturer",
  "gstRate",
  "cgstRate",
  "sgstRate",
  "igstRate",
  "includeGST",
  "includeIGST",
  "status",
  "description",
  "imageUrl",
  "isStockItem",
  "inStock",
  "batchRequired",
  "hasVariants",
  "rollTrackingEnabled",
  "isTextile",
  "textileItemType",
  "yarnType",
  "countSystem",
  "count",
  "denier",
  "ply",
  "twist",
  "coneWeight",
  "compositionTemplate",
  "fabricType",
  "construction",
  "gsm",
  "finishedWidth",
  "widthUom",
  "greyWidth",
  "finish",
  "design",
  "color",
  "shade",
  "chemicalType",
  "concentration",
  "hazardClass",
  "storageInstructions",
  "packingType",
  "packingDimensions",
  "materialGrade",
  "packingCapacity",
  "tags",
];

const example = [
  "",
  "Cotton Fiber",
  "Raw Material",
  "Natural Fiber",
  "Raw Material",
  "125.00",
  "150.00",
  "175.00",
  "100",
  "100",
  "20",
  "7",
  "kg",
  "KG",
  "KG",
  "",
  "5201",
  "Main Warehouse",
  "",
  "5",
  "2.5",
  "2.5",
  "5",
  "true",
  "false",
  "active",
  "Natural cotton fiber for textile composition",
  "",
  "true",
  "true",
  "true",
  "false",
  "false",
  "true",
  "Raw Material",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "Natural",
  "White",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "cotton;fiber;natural",
];

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(req) {
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const csv = [columns, example]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="item_bulk_upload_template.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating item template:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate item template" },
      { status: 500 }
    );
  }
}
