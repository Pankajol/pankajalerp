
import mongoose, { Types } from "mongoose";
import dbConnect from "@/lib/db";            // your db util
import SalesInvoice from "@/models/SalesInvoice"; // the model you pasted
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { autoSalesInvoice } from "@/lib/autoTransaction";

// -----------------------------------------------------------------------------
// POST /api/import/sales-invoice
// Body: { invoices: [ { ...flat CSV / JSON row... } ] }
// -----------------------------------------------------------------------------
// • Maps flat rows -> nested SalesInvoice docs
// • Handles batch and non‑batch items
// • Uses a Mongo transaction so either all docs save or none
// -----------------------------------------------------------------------------

export async function POST(request) {
  await dbConnect();

  const user = verifyJWT(getTokenFromHeader(request));
  if (!user?.companyId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { invoices } = await request.json();
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return Response.json(
      { success: false, error: "Body must be { invoices: [...] }" },
      { status: 400 }
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: map flat row to nested doc
  // ────────────────────────────────────────────────────────────────────────────
  const num = (v) => (v === "" || v === undefined ? 0 : Number(v));

  const rowToInvoiceDoc = (row) => {
        const item = {
      // Required ObjectId references – if missing, generate a placeholder so
      // validation passes (you can later back‑fill real references).
      item:       row.item || row.itemId,
      warehouse:  row.warehouse || row.warehouseId,

      itemCode:        row.itemCode,
      itemName:        row.itemName,
      itemDescription: row.itemDescription,
      quantity:        num(row.quantity),
      unitPrice:       num(row.unitPrice),
      discount:        num(row.discount),
      priceAfterDiscount: num(row.priceAfterDiscount),
      totalAmount:     num(row.totalAmount),
      gstAmount:       num(row.gstAmount),
      igstAmount:      num(row.igstAmount),
      warehouseName:   row.warehouseName,
      warehouseCode:   row.warehouseCode,
      taxOption:       row.taxOption || "GST",
      managedByBatch:  String(row.managedByBatch).toLowerCase() === "true",
    };

    if (item.managedByBatch && row.batchCode) {
      item.batches = [
        {
          batchCode:        row.batchCode,
          expiryDate:       row.expiryDate ? new Date(row.expiryDate) : null,
          manufacturer:     row.manufacturer,
          allocatedQuantity: num(row.allocatedQuantity || row.quantity),
          availableQuantity: num(row.availableQuantity),
        },
      ];
    }

    return {
      companyId:           user.companyId,
      createdBy:           user.id || user.userId,
      customer:            row.customer || row.customerId,
      invoiceNumber:       row.invoiceNumber || undefined,
      customerCode:        row.customerCode,
      customerName:        row.customerName,
      contactPerson:       row.contactPerson,
      refNumber:           row.refNumber,
      salesEmployee:       row.salesEmployee,
      invoiceDate:         row.invoiceDate || row.postingDate || row.orderDate ? new Date(row.invoiceDate || row.postingDate || row.orderDate) : new Date(),
      dueDate:             row.dueDate ? new Date(row.dueDate) : undefined,
      orderDate:           row.orderDate ? new Date(row.orderDate) : undefined,
      expectedDeliveryDate:row.expectedDeliveryDate ? new Date(row.expectedDeliveryDate) : undefined,
      remarks:             row.remarks,
      freight:             num(row.freight),
      rounding:            num(row.rounding),
      totalDownPayment:    num(row.totalDownPayment),
      appliedAmounts:      num(row.appliedAmounts),
      totalBeforeDiscount: num(row.totalBeforeDiscount),
      gstTotal:            num(row.gstTotal),
      grandTotal:          num(row.grandTotal || row.totalAmount),
      paidAmount:          num(row.paidAmount),
      remainingAmount:     num(row.remainingAmount || row.openBalance),
      paymentStatus:       row.paymentStatus || "Pending",
      items: [item],
    };
  };

  const docsByNumber = new Map();
  for (const row of invoices) {
    const doc = rowToInvoiceDoc(row);
    if (!doc.invoiceNumber || !Types.ObjectId.isValid(doc.customer) || !Types.ObjectId.isValid(doc.items[0].item) || !Types.ObjectId.isValid(doc.items[0].warehouse)) {
      return Response.json({ success: false, error: "Each row requires invoiceNumber, customer/customerId, item/itemId, and warehouse/warehouseId ObjectIds." }, { status: 400 });
    }
    const existing = docsByNumber.get(doc.invoiceNumber);
    if (existing) {
      existing.items.push(doc.items[0]);
      existing.totalBeforeDiscount += doc.totalBeforeDiscount;
      existing.gstTotal += doc.gstTotal;
    } else {
      docsByNumber.set(doc.invoiceNumber, doc);
    }
  }
  const docs = [...docsByNumber.values()].map((doc) => {
    const derivedTotal = doc.items.reduce((sum, item) => sum + item.totalAmount + item.gstAmount + item.igstAmount, 0);
    const grandTotal = doc.grandTotal || derivedTotal;
    return { ...doc, grandTotal, remainingAmount: doc.remainingAmount || Math.max(grandTotal - doc.paidAmount, 0) };
  });

    // ────────────────────────────────────────────────────────────────────────────
  // Transaction – optional (Mongo transactions need a replica‑set). If the
  // current connection is a standalone server, we fall back to a simple
  // insertMany.
  // ────────────────────────────────────────────────────────────────────────────

  const isReplica = mongoose.connection?.topology?.description?.type === "ReplicaSet";

  try {
    let result;

    if (isReplica) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        result = await SalesInvoice.insertMany(docs, { session, ordered: false });
        await session.commitTransaction();
        session.endSession();
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      // No replica‑set → insert without a transaction
      result = await SalesInvoice.insertMany(docs, { ordered: false });
    }

    const accountingErrors = [];
    for (const invoice of result) {
      if (invoice.grandTotal <= 0) continue;
      try {
        await autoSalesInvoice({
          companyId: user.companyId,
          amount: invoice.grandTotal,
          partyId: invoice.customer,
          partyName: invoice.customerName || "Customer",
          referenceId: invoice._id,
          referenceNumber: invoice.invoiceNumber,
          narration: `Sales Invoice ${invoice.invoiceNumber}`,
          date: invoice.invoiceDate,
          createdBy: user.id || user.userId,
        });
      } catch (error) {
        accountingErrors.push({ invoiceNumber: invoice.invoiceNumber, error: error.message });
      }
    }

    return Response.json({ success: true, inserted: result.length, accountingErrors });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
