import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import cloudinary from "@/lib/cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import GRN from "@/models/grnModels";
import PurchaseInvoice from "@/models/InvoiceModel";
import PurchaseOrder from "@/models/PurchaseOrder";
import Item from "@/models/ItemModels"; // registers the "Item" model used by items.item populate
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Payment from "@/models/Payment";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";
import AccountHead from "@/models/accounts/AccountHead";
import { autoPurchaseInvoice, autoPaymentEntry, reversePostedTransactions } from "@/lib/autoTransaction";

export const dynamic = "force-dynamic";

async function getPaymentAccountName(companyId, method, bankAccountId) {
  if (method === "cash") return "Cash in Hand";
  if (["upi", "card", "netbanking", "wallet"].includes(method)) return "Digital Payments";
  if (bankAccountId && Types.ObjectId.isValid(bankAccountId)) {
    const account = await AccountHead.findOne({ _id: bankAccountId, companyId, isActive: true }).select("name");
    if (account) return account.name;
  }
  return "Bank Account";
}

async function postPurchaseAccounting({ invoice, companyId, createdBy, session }) {
  await autoPurchaseInvoice({
    companyId, amount: invoice.grandTotal, taxAmount: invoice.gstTotal, fromGRN: Boolean(invoice.grn), partyId: invoice.supplier,
    partyName: invoice.supplierName || "Supplier", referenceId: invoice._id,
    referenceNumber: invoice.documentNumberPurchaseInvoice,
    narration: `Purchase Invoice ${invoice.documentNumberPurchaseInvoice}`,
    date: invoice.postingDate, createdBy, session,
  });
  for (const payment of invoice.payments || []) {
    if (!(Number(payment.amount) > 0)) continue;
    const bankAccountName = await getPaymentAccountName(companyId, payment.method, payment.bankAccountId);
    await autoPaymentEntry({
      companyId, amount: payment.amount, partyId: invoice.supplier,
      partyName: invoice.supplierName || "Supplier", referenceId: payment.paymentId,
      referenceNumber: invoice.documentNumberPurchaseInvoice, bankAccountName,
      bankAccountId: payment.bankAccountId || undefined, paymentMode: payment.method,
      narration: `Payment against ${invoice.documentNumberPurchaseInvoice}`,
      date: payment.paymentDate || invoice.postingDate, createdBy, session,
    });
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --------------------------------------------------------------
// Helper functions for file handling
// --------------------------------------------------------------
function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  return nodeReq;
}

async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });
    const nodeReq = createNodeCompatibleRequest(req);
    form.parse(nodeReq, (err, fields, files) => {
      if (err) return reject(err);
      const parsedFields = {};
      for (const key in fields) {
        parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      }
      const parsedFiles = {};
      for (const key in files) {
        parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
      }
      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
}

async function uploadFiles(fileObjects, folderName, companyId) {
  const uploadedFiles = [];
  const fileArray = Array.isArray(fileObjects) ? fileObjects : [];
  for (const file of fileArray) {
    if (!file || !file.filepath) continue;
    const result = await cloudinary.uploader.upload(file.filepath, {
      folder: `${folderName}/${companyId || "default_company"}`,
      resource_type: "auto",
      original_filename: file.originalFilename,
    });
    uploadedFiles.push({
      fileName: file.originalFilename || result.original_filename,
      fileUrl: result.secure_url,
      fileType: file.mimetype || "application/octet-stream",
      uploadedAt: new Date(),
      publicId: result.public_id,
    });
  }
  return uploadedFiles;
}

async function deleteFilesByPublicIds(publicIds) {
  if (!publicIds || publicIds.length === 0) return;
  for (const publicId of publicIds) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("Cloudinary delete error:", err);
    }
  }
}

// --------------------------------------------------------------
// Core function: Update inventory (stock + onOrder)
// --------------------------------------------------------------
async function processInvoiceItem(item, invoiceId, decoded, session, linkedToPO = false) {
  const qty = Number(item.quantity);
  const itemId = item.item?._id || item.item;
  const warehouseId = item.warehouse?._id || item.warehouse;
  const variantId = item.variant?.variantId || item.selectedVariantId;

  if (!itemId || !warehouseId || qty <= 0) {
    throw new Error(`Invalid item data for ${item.itemCode || "unknown item"}`);
  }

  console.log(`📊 [Invoice] Item: ${item.itemCode}, qty=${qty}, variantId=${variantId}, linkedToPO=${linkedToPO}`);

  let inventory = await Inventory.findOne({
    item: new Types.ObjectId(itemId),
    warehouse: new Types.ObjectId(warehouseId),
    companyId: decoded.companyId,
  }).session(session);

  if (!inventory) {
    inventory = new Inventory({
      companyId: decoded.companyId,
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
      quantity: 0,
      committed: 0,
      onOrder: 0,
      batches: [],
      hasVariants: !!variantId,
      variantInventory: [],
    });
    console.log(`🆕 Created new inventory record for item ${item.itemCode}`);
  }

  // 1. Decrease onOrder *only if this invoice is linked to a PO*
  if (linkedToPO) {
    let onOrderDecreased = false;
    if (variantId) {
      const variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
      if (variantInv) {
        const old = variantInv.onOrder;
        variantInv.onOrder = Math.max(variantInv.onOrder - qty, 0);
        console.log(`📉 Variant ${item.itemCode} onOrder: ${old} → ${variantInv.onOrder}`);
        onOrderDecreased = true;
      } else {
        console.warn(`⚠️ Variant ${item.itemCode} not found in variantInventory – cannot decrease its onOrder.`);
      }
    }
    // Fallback: if variant missing but main inventory has onOrder, decrease it
    if (!onOrderDecreased && inventory.onOrder > 0) {
      const old = inventory.onOrder;
      inventory.onOrder = Math.max(inventory.onOrder - qty, 0);
      console.log(`📉 Fallback: main inventory onOrder for ${item.itemCode}: ${old} → ${inventory.onOrder}`);
      onOrderDecreased = true;
    }
    if (!onOrderDecreased) {
      console.error(`❌ Could not decrease onOrder for ${item.itemCode}. Inventory.onOrder = ${inventory.onOrder}, variant not found.`);
    }
  } else {
    console.log(`ℹ️ linkedToPO = false, skipping onOrder decrease.`);
  }

  // 2. Always increase physical stock (invoice = goods receipt)
  if (variantId) {
    let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
    if (!variantInv) {
      variantInv = {
        variantId: new Types.ObjectId(variantId),
        sku: item.itemCode,
        quantity: 0,
        committed: 0,
        onOrder: 0,
        batches: [],
      };
      inventory.variantInventory.push(variantInv);
      console.log(`➕ Created new variant entry for ${item.itemCode}`);
    }
    const old = variantInv.quantity;
    variantInv.quantity += qty;
    console.log(`📈 Variant ${item.itemCode} quantity: ${old} → ${variantInv.quantity}`);
  } else {
    const old = inventory.quantity;
    inventory.quantity += qty;
    console.log(`📈 Item ${item.itemCode} quantity: ${old} → ${inventory.quantity}`);
  }

  await inventory.save({ session });
  if (typeof inventory.updateStockStatus === "function") await inventory.updateStockStatus();

  // Stock movement log
  await StockMovement.create(
    [
      {
        companyId: decoded.companyId,
        createdBy: decoded.userId || decoded.id,
        item: new Types.ObjectId(itemId),
        variantId: variantId ? new Types.ObjectId(variantId) : null,
        warehouse: new Types.ObjectId(warehouseId),
        movementType: "IN",
        quantity: qty,
        reference: invoiceId,
        referenceType: "PurchaseInvoice",
        remarks: linkedToPO
          ? "Stock received via Purchase Invoice (Linked PO)"
          : "Stock received via Purchase Invoice",
      },
    ],
    { session }
  );
}

// --------------------------------------------------------------
// POST – Create Purchase Invoice
// --------------------------------------------------------------
// Reverses the physical receipt for a direct or PO-backed purchase invoice.
// A GRN-backed invoice has no stock movement of its own.
async function reverseInvoiceItem(item, invoiceId, decoded, session, linkedToPO = false) {
  const qty = Number(item.quantity);
  const itemId = item.item?._id || item.item;
  const warehouseId = item.warehouse?._id || item.warehouse;
  const variantId = item.variant?.variantId || item.selectedVariantId;
  if (!itemId || !warehouseId || qty <= 0) throw new Error(`Invalid item data for ${item.itemCode || "unknown item"}`);
  const inventory = await Inventory.findOne({ item: new Types.ObjectId(itemId), warehouse: new Types.ObjectId(warehouseId), companyId: decoded.companyId }).session(session);
  if (!inventory) throw new Error(`Cannot cancel: stock record for ${item.itemCode || itemId} was not found`);
  if (variantId) {
    const variant = inventory.variantInventory.find((entry) => String(entry.variantId) === String(variantId));
    if (!variant || Number(variant.quantity || 0) < qty) throw new Error(`Cannot cancel: insufficient available stock for ${item.itemCode || itemId}`);
    variant.quantity -= qty;
    if (linkedToPO) variant.onOrder = Number(variant.onOrder || 0) + qty;
  } else {
    if (Number(inventory.quantity || 0) < qty) throw new Error(`Cannot cancel: insufficient available stock for ${item.itemCode || itemId}`);
    inventory.quantity -= qty;
    if (linkedToPO) inventory.onOrder = Number(inventory.onOrder || 0) + qty;
  }
  await inventory.save({ session });
  await StockMovement.create([{
    companyId: decoded.companyId, createdBy: decoded.userId || decoded.id,
    item: new Types.ObjectId(itemId), variantId: variantId ? new Types.ObjectId(variantId) : null,
    warehouse: new Types.ObjectId(warehouseId), movementType: "OUT", quantity: qty,
    reference: invoiceId, referenceType: "PurchaseInvoice",
    remarks: "Stock reversal for cancelled Purchase Invoice",
  }], { session });
}

export async function POST(req) {
  await dbConnect();

  // 1. Parse and prepare data OUTSIDE transaction
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });

  const { fields, files } = await parseForm(req);
  const invoiceData = JSON.parse(fields.invoiceData || "{}");
  const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
  const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

  invoiceData.companyId = decoded.companyId;
  delete invoiceData._id;

  // File attachments
  const newUploadedFiles = await uploadFiles(files.newAttachments || [], "purchase-invoices", decoded.companyId);
  invoiceData.attachments = [
    ...(Array.isArray(existingFilesMetadata)
      ? existingFilesMetadata.filter((f) => !removedFilesPublicIds.includes(f.publicId))
      : []),
    ...newUploadedFiles,
  ];
  await deleteFilesByPublicIds(removedFilesPublicIds);

  if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
    return NextResponse.json({ success: false, error: "Invoice must contain at least one item" }, { status: 400 });
  }

  // Normalize status
  const statusMapping = {
    draft: "draft",
    submitted: "submitted",
    pending: "pending",
    approved: "posted",
    rejected: "rejected",
    posted: "posted",
    cancelled: "cancelled",
  };
  invoiceData.status = statusMapping[invoiceData.status?.toLowerCase()] || "draft";

  // Form controls submit empty strings for optional relations. Mongoose cannot
  // cast "" to ObjectId, and a blank invoiceType is not a valid enum value.
  // Normalize these once, before the document is created or stock is touched.
  for (const field of ["purchaseOrder", "grn", "sourceId"]) {
    if (invoiceData[field] === "" || invoiceData[field] === undefined) {
      invoiceData[field] = null;
    }
  }
  const validInvoiceTypes = ["Normal", "POCopy", "GRNCopy"];
  if (!validInvoiceTypes.includes(invoiceData.invoiceType)) {
    invoiceData.invoiceType = invoiceData.purchaseOrder
      ? "POCopy"
      : invoiceData.grn
        ? "GRNCopy"
        : "Normal";
  }

  // Clean payments
  if (invoiceData.payments && Array.isArray(invoiceData.payments)) {
    invoiceData.payments = invoiceData.payments.map((pmt) => ({
      ...pmt,
      amount: Number(pmt.amount) || 0,
      bankAccountId: pmt.bankAccountId === "" || pmt.bankAccountId === undefined ? null : pmt.bankAccountId,
      paymentDate: pmt.paymentDate ? new Date(pmt.paymentDate) : new Date(),
    }));
  } else {
    invoiceData.payments = [];
  }

  const grandTotal = Math.round((Number(invoiceData.grandTotal) || 0) * 100) / 100;
  const totalPaid = Math.round(invoiceData.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100) / 100;
  if (totalPaid - grandTotal > 0.009) {
    return NextResponse.json({ success: false, error: "Total payment cannot exceed the invoice total" }, { status: 400 });
  }
  const bankPaymentIds = invoiceData.payments
    .filter((payment) => ["bank", "cheque"].includes(payment.method))
    .map((payment) => payment.bankAccountId)
    .filter(Boolean);
  if (bankPaymentIds.length !== invoiceData.payments.filter((payment) => ["bank", "cheque"].includes(payment.method)).length) {
    return NextResponse.json({ success: false, error: "Select a bank account for every bank or cheque payment" }, { status: 400 });
  }
  if (bankPaymentIds.length) {
    const accounts = await AccountHead.countDocuments({ _id: { $in: bankPaymentIds }, companyId: decoded.companyId, type: "Asset", isActive: true });
    if (accounts !== new Set(bankPaymentIds.map(String)).size) {
      return NextResponse.json({ success: false, error: "One or more selected payment accounts are unavailable" }, { status: 400 });
    }
  }
  invoiceData.paidAmount = totalPaid;
  invoiceData.remainingAmount = Math.max(grandTotal - totalPaid, 0);
  invoiceData.paymentStatus = totalPaid === 0 ? "Pending" : totalPaid >= grandTotal ? "Paid" : "Partial";

  // Generate invoice number (outside transaction)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let fyStart = currentYear,
    fyEnd = currentYear + 1;
  if (currentMonth < 4) {
    fyStart = currentYear - 1;
    fyEnd = currentYear;
  }
  const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
  const key = "PurchaseInvoice";

  let counter, retries = 3;
  while (retries > 0) {
    try {
      counter = await Counter.findOneAndUpdate(
        { id: key, companyId: decoded.companyId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw new Error("Failed to generate document number after retries");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  invoiceData.documentNumberPurchaseInvoice = `PURCH-INV/${financialYear}/${String(counter.seq).padStart(5, "0")}`;

  // 2. Transaction with retry
  let attempt = 0;
  const maxAttempts = 3;
  let invoice = null;

  while (attempt < maxAttempts) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const [createdInvoice] = await PurchaseInvoice.create([invoiceData], { session });
      invoice = createdInvoice;

      // ===================== FIXED FLOW DETECTION =====================
      // Determine flow based on actual document references, not the invoiceType string.
      // - If grn is present AND no purchaseOrder → GRN copy (stock already updated by GRN)
      // - If purchaseOrder is present (regardless of grn) → PO copy (update stock & PO)
      // - Otherwise → Direct invoice (increase physical stock, no onOrder change)
      const hasGRN = !!invoiceData.grn;
      const hasPO = !!invoiceData.purchaseOrder;

      console.log(`🔍 Flow: hasGRN=${hasGRN}, hasPO=${hasPO}`);

      if (hasGRN && !hasPO) {
        // GRN copy: close the GRN, do NOT change stock
        if (invoiceData.grn) {
          const grnDoc = await GRN.findById(invoiceData.grn).session(session);
          if (grnDoc) {
            grnDoc.status = "Close";
            grnDoc.invoiceId = invoice._id;
            await grnDoc.save({ session });
          }
        }
      } else {
        // PO copy or Direct invoice → process stock (increase physical, decrease onOrder if PO)
        const linkedToPO = hasPO;
        for (const it of invoiceData.items) {
          await processInvoiceItem(it, invoice._id, decoded, session, linkedToPO);
        }
      }
      // ==================================================================

      // Update linked Purchase Order (received quantity & status)
      if (invoiceData.purchaseOrder) {
        const po = await PurchaseOrder.findById(invoiceData.purchaseOrder).session(session);
        if (po) {
          for (const invItem of invoiceData.items) {
            const poItem = po.items.find((pi) => pi.item.toString() === (invItem.item?._id || invItem.item));
            if (poItem) {
              poItem.receivedQuantity = (poItem.receivedQuantity || 0) + invItem.quantity;
              poItem.quantity = Math.max(poItem.orderedQuantity - poItem.receivedQuantity, 0);
            }
          }
          const allReceived = po.items.every((pi) => pi.receivedQuantity >= pi.orderedQuantity);
          po.orderStatus = allReceived ? "Received" : "PartiallyReceived";
          await po.save({ session });
        }
      }

      // Invoice, stock, supplier ledger and payment journals are one atomic
      // operation. If any selected account/payment cannot post, this session
      // rolls everything back and no half-saved invoice remains.
      if (invoiceData.status === "posted") {
        await postPurchaseAccounting({
          invoice,
          companyId: decoded.companyId,
          createdBy: decoded.id || decoded.userId,
          session,
        });
      }

      await session.commitTransaction();
      session.endSession();
      break; // success
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      attempt++;
      console.error(`Transaction attempt ${attempt} failed:`, error);
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  }

  return NextResponse.json(
    { success: true, message: "Invoice created and stock updated", data: invoice },
    { status: 201 }
  );
}

// --------------------------------------------------------------
// GET – Retrieve invoices (single or list with pagination)
// --------------------------------------------------------------
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    if (id) {
      const invoice = await PurchaseInvoice.findOne({ _id: id, companyId: decoded.companyId })
        .populate("supplier", "supplierCode supplierName")
        .populate("items.item", "itemCode itemName imageUrl variants")
        .populate("grn")
        .populate("purchaseOrder");
      if (!invoice) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: invoice });
    }

    const query = { companyId: decoded.companyId };
    if (status && status !== "All") query.paymentStatus = status;
    if (search) {
      query.$or = [
        { documentNumberPurchaseInvoice: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { refNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      PurchaseInvoice.find(query)
        .populate("supplier", "supplierName supplierCode")
        .populate("items.item", "itemCode itemName imageUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseInvoice.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/purchaseInvoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --------------------------------------------------------------
// PUT – Update invoice (only meta fields, no stock changes)
// --------------------------------------------------------------
export async function PUT(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const { fields, files } = await parseForm(req);
    const invoiceData = JSON.parse(fields.invoiceData || "{}");
    const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
    const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

    const existing = await PurchaseInvoice.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!existing) return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });

    // Handle attachments
    const newUploadedFiles = await uploadFiles(files.newAttachments || [], "purchase-invoices", decoded.companyId);
    invoiceData.attachments = [
      ...(Array.isArray(existingFilesMetadata) ? existingFilesMetadata.filter((f) => !removedFilesPublicIds.includes(f.publicId)) : []),
      ...newUploadedFiles,
    ];
    await deleteFilesByPublicIds(removedFilesPublicIds);
    delete invoiceData._id;

    const statusMapping = {
      draft: "draft", submitted: "submitted", pending: "pending", approved: "posted",
      rejected: "rejected", posted: "posted", cancelled: "cancelled",
    };
    const nextStatus = invoiceData.status
      ? (statusMapping[String(invoiceData.status).toLowerCase()] || existing.status)
      : existing.status;

    if (nextStatus === "cancelled") {
      throw new Error("Use the cancel action so stock and accounting are reversed together");
    }

    // A posted document is immutable financially. Attachments and remarks may
    // still be corrected, while payments must go through the payment endpoint
    // so every payment has its own source id and journal.
    if (existing.status === "posted" && invoiceData.payments !== undefined) {
      const samePayments = JSON.stringify(existing.payments || []) === JSON.stringify(invoiceData.payments || []);
      if (!samePayments) throw new Error("Use the payment entry flow to change payments on a posted invoice");
    }

    // Update only allowed fields
    const updatePayload = {
      status: nextStatus,
      remarks: invoiceData.remarks,
      attachments: invoiceData.attachments,
      updatedAt: new Date(),
    };
    const updated = await PurchaseInvoice.findByIdAndUpdate(id, updatePayload, { new: true, session });

    // A draft becomes an accounting document only when it is posted. Invoice,
    // embedded payments, and their journals are committed or rolled back
    // together; no posted invoice can be left without a payable entry.
    if (existing.status !== "posted" && updated.status === "posted") {
      await postPurchaseAccounting({
        invoice: updated,
        companyId: decoded.companyId,
        createdBy: decoded.id || decoded.userId,
        session,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Invoice updated", data: updated });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("PUT /api/purchaseInvoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --------------------------------------------------------------
// DELETE – Delete invoice (without reversing stock)
// --------------------------------------------------------------
export async function DELETE(req) {
  let session;
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    session = await mongoose.startSession();
    session.startTransaction();
    const invoice = await PurchaseInvoice.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!invoice) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    if (invoice.status === "cancelled") return NextResponse.json({ success: false, error: "Invoice is already cancelled" }, { status: 409 });

    if (!invoice.grn) {
      for (const item of invoice.items || []) {
        await reverseInvoiceItem(item, invoice._id, decoded, session, Boolean(invoice.purchaseOrder));
      }
    } else {
      const grn = await GRN.findById(invoice.grn).session(session);
      if (grn) {
        grn.status = "Open";
        grn.invoiceId = null;
        await grn.save({ session });
      }
    }

    if (invoice.purchaseOrder) {
      const po = await PurchaseOrder.findById(invoice.purchaseOrder).session(session);
      if (po) {
        for (const invoiceItem of invoice.items || []) {
          const poItem = po.items.find((item) => String(item.item) === String(invoiceItem.item?._id || invoiceItem.item));
          if (poItem) {
            poItem.receivedQuantity = Math.max(Number(poItem.receivedQuantity || 0) - Number(invoiceItem.quantity || 0), 0);
            poItem.quantity = Math.max(Number(poItem.orderedQuantity || 0) - poItem.receivedQuantity, 0);
          }
        }
        const received = po.items.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
        po.orderStatus = received === 0 ? "Open" : "PartiallyReceived";
        await po.save({ session });
      }
    }

    const relatedPayments = await Payment.find({
      companyId: decoded.companyId,
      "appliedInvoices.invoiceId": invoice._id,
      status: { $ne: "Cancelled" },
    }).session(session);
    if (relatedPayments.some((payment) => payment.appliedInvoices.length !== 1)) {
      throw new Error("Cancel or reallocate a payment shared with another invoice before cancelling this invoice");
    }

    await reversePostedTransactions({
      companyId: decoded.companyId,
      referenceIds: [
        invoice._id,
        ...(invoice.payments || []).map((payment) => payment.paymentId),
        ...relatedPayments.map((payment) => payment._id),
      ],
      createdBy: decoded.id || decoded.userId,
      date: new Date(),
      narration: `Cancellation of purchase invoice ${invoice.documentNumberPurchaseInvoice}`,
      session,
    });
    if (relatedPayments.length) {
      await Payment.updateMany({ _id: { $in: relatedPayments.map((payment) => payment._id) } }, { $set: { status: "Cancelled" } }, { session });
    }
    invoice.status = "cancelled";
    await invoice.save({ session });
    await session.commitTransaction();

    // Delete Cloudinary attachments
    if (invoice.attachments?.length) {
      const publicIds = invoice.attachments.map((a) => a.publicId).filter(Boolean);
      await deleteFilesByPublicIds(publicIds);
    }

    return NextResponse.json({ success: true, message: "Invoice cancelled; stock and accounting were reversed" });
  } catch (error) {
    if (session?.inTransaction()) await session.abortTransaction();
    console.error("DELETE /api/purchaseInvoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (session) await session.endSession();
  }
}

// import { NextResponse } from "next/server";
// import mongoose, { Types } from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import GRN from "@/models/grnModels";
// import dbConnect from "@/lib/db";
// import Supplier from "@/models/SupplierModels";
// import PurchaseInvoice from "@/models/InvoiceModel";
// import PurchaseOrder from "@/models/PurchaseOrder";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Counter from "@/models/Counter";
// import AccountHead from "@/models/accounts/AccountHead";

// // ✅ ADD: Auto accounting entry
// import { autoPurchaseInvoice, autoPaymentEntry } from "@/lib/autoTransaction";

// export const dynamic = 'force-dynamic';

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// function createNodeCompatibleRequest(req) {
//   const nodeReq = Readable.fromWeb(req.body);
//   nodeReq.headers = Object.fromEntries(req.headers.entries());
//   nodeReq.method = req.method;
//   return nodeReq;
// }

// async function parseForm(req) {
//   return new Promise((resolve, reject) => {
//     const form = formidable({ multiples: true, keepExtensions: true });
//     const nodeReq = createNodeCompatibleRequest(req);
//     form.parse(nodeReq, (err, fields, files) => {
//       if (err) return reject(err);
//       const parsedFields = {};
//       for (const key in fields) {
//         parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
//       }
//       const parsedFiles = {};
//       for (const key in files) {
//         parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
//       }
//       resolve({ fields: parsedFields, files: parsedFiles });
//     });
//   });
// }

// async function uploadFiles(fileObjects, folderName, companyId) {
//   const uploadedFiles = [];
//   const fileArray = Array.isArray(fileObjects) ? fileObjects : [];
//   for (const file of fileArray) {
//     if (!file || !file.filepath) continue;
//     const result = await cloudinary.uploader.upload(file.filepath, {
//       folder: `${folderName}/${companyId || "default_company"}`,
//       resource_type: "auto",
//     });
//     uploadedFiles.push({
//       fileName: file.originalFilename || result.original_filename,
//       fileUrl: result.secure_url,
//       fileType: file.mimetype || "application/octet-stream",
//       uploadedAt: new Date(),
//       publicId: result.public_id,
//     });
//   }
//   return uploadedFiles;
// }

// async function deleteFilesByPublicIds(publicIds) {
//   if (!publicIds || publicIds.length === 0) return;
//   for (const publicId of publicIds) {
//     try { await cloudinary.uploader.destroy(publicId); }
//     catch (err) { console.error("Cloudinary delete error:", err); }
//   }
// }

// async function processInvoiceItem(item, invoiceId, decoded, session, linkedToPO = false) {
//   const qty = Number(item.quantity);
//   const itemId = item.item?._id || item.item;
//   const warehouseId = item.warehouse;
//   const binId = item.selectedBin?._id || null;

//   if (!itemId || qty <= 0)
//     throw new Error(`Invalid item data for ${item.itemCode || 'unknown item'}`);

//   let inventoryDoc = await Inventory.findOne({
//     item: new Types.ObjectId(itemId),
//     warehouse: new Types.ObjectId(warehouseId),
//     bin: binId ? new Types.ObjectId(binId) : { $in: [null, undefined] },
//     companyId: decoded.companyId,
//   }).session(session);

//   if (!inventoryDoc) {
//     inventoryDoc = await Inventory.create([{
//       item: new Types.ObjectId(itemId),
//       warehouse: new Types.ObjectId(warehouseId),
//       bin: binId ? new Types.ObjectId(binId) : null,
//       companyId: decoded.companyId,
//       quantity: 0, committed: 0, onOrder: 0, batches: [],
//     }], { session });
//     inventoryDoc = inventoryDoc[0];
//   }

//   if (linkedToPO)
//     inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - qty, 0);

//   if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches) && item.batches.length > 0) {
//     for (const batch of item.batches) {
//       const batchQty = Number(batch.batchQuantity || batch.allocatedQuantity || 0);
//       if (!batch.batchNumber || batchQty <= 0) continue;
//       if (!Array.isArray(inventoryDoc.batches)) inventoryDoc.batches = [];
//       const existingBatch = inventoryDoc.batches.find(b => b.batchNumber === batch.batchNumber);
//       if (existingBatch) {
//         existingBatch.quantity += batchQty;
//         if (binId) existingBatch.bin = new Types.ObjectId(binId);
//       } else {
//         inventoryDoc.batches.push({
//           batchNumber: batch.batchNumber, quantity: batchQty,
//           expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
//           manufacturer: batch.manufacturer || "", unitPrice: batch.unitPrice || 0,
//           bin: binId ? new Types.ObjectId(binId) : null,
//         });
//       }
//       inventoryDoc.quantity += batchQty;
//       await StockMovement.create([{
//         item: new Types.ObjectId(itemId), warehouse: new Types.ObjectId(warehouseId),
//         bin: binId ? new Types.ObjectId(binId) : null, movementType: "IN", quantity: batchQty,
//         reference: invoiceId, referenceType: "PurchaseInvoice",
//         remarks: linkedToPO ? `Stock received via Purchase Invoice (Linked PO) - Batch ${batch.batchNumber}` : `Stock received via Purchase Invoice - Batch ${batch.batchNumber}`,
//         companyId: decoded.companyId, createdBy: decoded.userId,
//       }], { session });
//     }
//   } else {
//     inventoryDoc.quantity += qty;
//     await StockMovement.create([{
//       item: new Types.ObjectId(itemId), warehouse: new Types.ObjectId(warehouseId),
//       bin: binId ? new Types.ObjectId(binId) : null, movementType: "IN", quantity: qty,
//       reference: invoiceId, referenceType: "PurchaseInvoice",
//       remarks: linkedToPO ? "Stock received via Purchase Invoice (Linked PO)" : "Stock received via Purchase Invoice",
//       companyId: decoded.companyId, createdBy: decoded.userId,
//     }], { session });
//   }
//   await inventoryDoc.save({ session });
// }

// // ─── POST ─────────────────────────────────────────────────────
// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized");
//     const decoded = verifyJWT(token);
//     if (!decoded?.companyId) throw new Error("Invalid token payload");

//     const { fields, files } = await parseForm(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");
//     const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
//     const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

//     invoiceData.companyId = decoded.companyId;
//     delete invoiceData._id;

//     // Handle attachments
//     const newUploadedFiles = await uploadFiles(files.newAttachments || [], "purchase-invoices", decoded.companyId);
//     invoiceData.attachments = [
//       ...(Array.isArray(existingFilesMetadata) ? existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId)) : []),
//       ...newUploadedFiles,
//     ];
//     await deleteFilesByPublicIds(removedFilesPublicIds);

//     if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0)
//       throw new Error("Invoice must contain at least one item");

//     // ========== FIX 1: Normalize status ==========
//     // Map frontend status to valid enum values
//     const statusMapping = {
//       "draft": "draft",
//       "submitted": "submitted", 
//       "pending": "pending",
//       "approved": "pending",  // Map approved to pending if your schema doesn't have approved
//       "rejected": "rejected",
//       "posted": "posted",
//       "cancelled": "cancelled"
//     };
//     const rawStatus = (invoiceData.status || "draft").toLowerCase();
//     invoiceData.status = statusMapping[rawStatus] || "draft";

//     // ========== FIX 2: Clean payments array ==========
//     // Convert empty string bankAccountId to null to avoid CastError
//     if (invoiceData.payments && Array.isArray(invoiceData.payments)) {
//       invoiceData.payments = invoiceData.payments.map(pmt => {
//         const amount = Number(pmt.amount) || 0;
//         let bankAccountId = pmt.bankAccountId;
//         if (bankAccountId === "" || bankAccountId === undefined || bankAccountId === null) {
//           bankAccountId = null;
//         }
//         const paymentDate = pmt.paymentDate ? new Date(pmt.paymentDate) : new Date();
//         return {
//           ...pmt,
//           amount,
//           bankAccountId,
//           paymentDate,
//         };
//       });
//     } else {
//       invoiceData.payments = [];
//     }

//     // Calculate totals and payment status
//     const grandTotal = Number(invoiceData.grandTotal) || 0;
//     let totalPaid = 0;
    
//     if (invoiceData.payments.length > 0) {
//       totalPaid = invoiceData.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
//     } else {
//       totalPaid = Number(invoiceData.paidAmount) || 0;
//       if (totalPaid > 0) {
//         invoiceData.payments = [{
//           amount: totalPaid,
//           method: invoiceData.paymentMethod || "cash",
//           bankAccountId: invoiceData.bankAccountId || null,
//           paymentDate: invoiceData.paymentDate ? new Date(invoiceData.paymentDate) : new Date(),
//           notes: invoiceData.paymentNotes || "Payment recorded at invoice creation"
//         }];
//       }
//     }

//     invoiceData.paidAmount = totalPaid;
//     invoiceData.remainingAmount = Math.max(grandTotal - totalPaid, 0);
    
//     if (totalPaid === 0) invoiceData.paymentStatus = "Pending";
//     else if (totalPaid >= grandTotal) invoiceData.paymentStatus = "Paid";
//     else invoiceData.paymentStatus = "Partial";

//     // Generate invoice number
//     const now = new Date();
//     const currentYear = now.getFullYear();
//     const currentMonth = now.getMonth() + 1;
//     let fyStart = currentYear, fyEnd = currentYear + 1;
//     if (currentMonth < 4) { fyStart = currentYear - 1; fyEnd = currentYear; }
//     const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//     const key = "PurchaseInvoice";

//     let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);
//     if (!counter) {
//       const [created] = await Counter.create([{ id: key, companyId: decoded.companyId, seq: 1 }], { session });
//       counter = created;
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }
//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     invoiceData.documentNumberPurchaseInvoice = `PURCH-INV/${financialYear}/${paddedSeq}`;

//     // Create invoice
//     const [invoice] = await PurchaseInvoice.create([invoiceData], { session });

//     const linkedToPO = !!invoiceData.purchaseOrderId;

//     // Process GRN if invoiceType is GRNCopy
//     if (invoiceData.invoiceType?.trim().toLowerCase() === "grncopy") {
//       const grnDoc = await GRN.findById(invoiceData.grn).session(session);
//       if (grnDoc) {
//         grnDoc.status = "Close";
//         grnDoc.invoiceId = invoice._id;
//         await grnDoc.save({ session });
//         console.log(`✅ GRN ${grnDoc._id} marked as Invoiced`);
//       } else {
//         console.warn(`⚠️ GRN not found for ID: ${invoiceData.grn}`);
//       }
//     } else {
//       for (const item of invoiceData.items) {
//         await processInvoiceItem(item, invoice._id, decoded, session, linkedToPO);
//       }
//     }

//     // Update Purchase Order if linked
//     if (invoiceData.purchaseOrderId) {
//       const po = await PurchaseOrder.findById(invoiceData.purchaseOrderId).session(session);
//       if (po) {
//         let allItemsInvoiced = true;
//         for (const poItem of po.items) {
//           const invItem = invoiceData.items.find(i => i.item?.toString() === poItem.item?.toString());
//           if (invItem) poItem.receivedQuantity = (poItem.receivedQuantity || 0) + Number(invItem.quantity);
//           const remaining = Math.max(Number(poItem.orderedQuantity) - poItem.receivedQuantity, 0);
//           poItem.quantity = remaining;
//           if (remaining > 0) allItemsInvoiced = false;
//         }
//         po.orderStatus = allItemsInvoiced ? "Close" : "Open";
//         po.stockStatus = allItemsInvoiced ? "Updated" : "Adjusted";
//         await po.save({ session });
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();

//     // ─────────────────────────────────────────────────────
//     // 📌 ACCOUNTING ENTRIES (after commit)
//     // ─────────────────────────────────────────────────────

//     // 1. Purchase Entry (always)
//     try {
//       await autoPurchaseInvoice({
//         companyId:       decoded.companyId,
//         amount:          grandTotal,
//         partyId:         invoiceData.supplier || invoiceData.supplierId || null,
//         partyName:       invoiceData.supplierName || invoiceData.supplier?.name || "Supplier",
//         referenceId:     invoice._id,
//         referenceNumber: invoice.documentNumberPurchaseInvoice,
//         narration:       `Purchase Invoice ${invoice.documentNumberPurchaseInvoice}`,
//         date:            invoiceData.postingDate || new Date(),
//         createdBy:       decoded.id || decoded.userId,
//       });
//     } catch (err) {
//       console.error(`⚠️ Purchase accounting failed for ${invoice.documentNumberPurchaseInvoice}:`, err.message);
//     }

//     // 2. Payment Entries (for each payment) - only if autoPaymentEntry exists
//     if (typeof autoPaymentEntry === 'function') {
//       for (const pmt of invoiceData.payments) {
//         try {
//           let creditAccountId = null;
          
//           if (pmt.method === "cash") {
//             const cashAcc = await AccountHead.findOne({
//               companyId: decoded.companyId,
//               name: { $regex: "^Cash in Hand$", $options: "i" }
//             });
//             if (cashAcc) creditAccountId = cashAcc._id;
//             else console.warn("Cash in Hand account not found");
//           }
//           else if (pmt.method === "bank" && pmt.bankAccountId) {
//             creditAccountId = pmt.bankAccountId;
//           }
//           else if (["upi", "card", "netbanking", "wallet"].includes(pmt.method)) {
//             let digitalAcc = await AccountHead.findOne({
//               companyId: decoded.companyId,
//               name: { $regex: "^Digital Payments$", $options: "i" }
//             });
//             if (!digitalAcc) {
//               digitalAcc = await AccountHead.findOne({
//                 companyId: decoded.companyId,
//                 type: "Asset",
//                 group: { $in: ["Bank Account", "Current Asset"] },
//                 isActive: true
//               });
//             }
//             if (digitalAcc) creditAccountId = digitalAcc._id;
//           }
//           else if (pmt.method === "cheque") {
//             if (pmt.bankAccountId) creditAccountId = pmt.bankAccountId;
//             else {
//               let chequeAcc = await AccountHead.findOne({
//                 companyId: decoded.companyId,
//                 name: { $regex: "^Cheque Suspense$", $options: "i" }
//               });
//               if (!chequeAcc) {
//                 chequeAcc = await AccountHead.create({
//                   companyId: decoded.companyId,
//                   name: "Cheque Suspense",
//                   type: "Asset",
//                   group: "Current Asset",
//                   balanceType: "Debit",
//                   isSystemAccount: false
//                 });
//               }
//               creditAccountId = chequeAcc._id;
//             }
//           }

//           if (creditAccountId) {
//             await autoPaymentEntry({
//               companyId:       decoded.companyId,
//               amount:          pmt.amount,
//               partyId:         invoiceData.supplier || invoiceData.supplierId,
//               referenceId:     invoice._id,
//               referenceNumber: invoice.documentNumberPurchaseInvoice,
//               paymentMethod:   pmt.method,
//               bankAccountId:   creditAccountId,
//               narration:       `Payment against ${invoice.documentNumberPurchaseInvoice} (${pmt.method})`,
//               date:            pmt.paymentDate || invoiceData.postingDate || new Date(),
//               createdBy:       decoded.id || decoded.userId,
//             });
//           } else {
//             console.warn(`No credit account found for payment method ${pmt.method}, amount ${pmt.amount}`);
//           }
//         } catch (pmtErr) {
//           console.error(`⚠️ Payment accounting failed for ${invoice.documentNumberPurchaseInvoice} (${pmt.method}):`, pmtErr.message);
//         }
//       }
//     }

//     return NextResponse.json(
//       { success: true, message: "Invoice created and stock updated successfully", data: invoice },
//       { status: 201 }
//     );

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("POST /api/purchase-invoice error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

// // ─── GET ──────────────────────────────────────────────────────
// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

//     const { searchParams } = new URL(req.url);
//     const supplierCode = searchParams.get("supplierCode");

//     const query = { companyId: user.companyId };
//     if (supplierCode) query.supplierCode = supplierCode;

//     const invoices = await PurchaseInvoice.find(query).sort({ createdAt: -1 });

//     return new Response(JSON.stringify({ success: true, data: invoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     return new Response(
//       JSON.stringify({ success: false, message: "Server error", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

