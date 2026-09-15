import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DeliverySubscription from "@/models/DeliverySubscription";
import SalesOrder from "@/models/SalesOrder";
import Customer from "@/models/CustomerModel";

const TIME_ZONE = "Asia/Kolkata";
const indiaDate = (date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);
const weekday = (date) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
  new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date)
);

function isDue(subscription, target, targetKey) {
  if (subscription.status !== "active" || subscription.skipDates?.includes(targetKey)) return false;
  if (subscription.frequency === "daily") return true;
  if (subscription.frequency === "custom") return subscription.weekdays?.includes(weekday(target));
  const start = new Date(`${indiaDate(subscription.startDate)}T00:00:00+05:30`);
  const delivery = new Date(`${targetKey}T00:00:00+05:30`);
  return Math.floor((delivery - start) / 86400000) % 2 === 0;
}

export async function GET(req) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const target = new Date(Date.now() + 86400000);
    const targetKey = indiaDate(target);
    const subscriptions = await DeliverySubscription.find({ status: "active" })
      .populate("productId", "itemCode itemName description images imageUrl salesPrice unitPrice active status stockQuantity quantity variants")
      .lean();
    const due = subscriptions.filter((subscription) =>
      subscription.productId && subscription.productId.active !== false &&
      subscription.productId.status !== "inactive" && (() => {
        const variant = subscription.variantId
          ? (subscription.productId.variants || []).find((item) => String(item._id) === subscription.variantId)
          : null;
        return Number(variant?.quantity ?? subscription.productId.stockQuantity ?? subscription.productId.quantity ?? 0) >= subscription.quantity;
      })() && isDue(subscription, target, targetKey)
    );
    const groups = due.reduce((result, subscription) => {
      const key = `${subscription.companyId}:${subscription.customerId}`;
      (result[key] ||= []).push(subscription);
      return result;
    }, {});

    let created = 0;
    let skipped = 0;
    for (const rows of Object.values(groups)) {
      const first = rows[0];
      const runKey = `DAILY:${first.companyId}:${first.customerId}:${targetKey}`;
      if (await SalesOrder.exists({ subscriptionRunKey: runKey })) { skipped += 1; continue; }
      const customer = await Customer.findOne({ _id: first.customerId, companyId: first.companyId }).lean();
      if (!customer) { skipped += 1; continue; }
      const items = rows.map((subscription) => {
        const product = subscription.productId;
        const variant = subscription.variantId
          ? (product.variants || []).find((item) => String(item._id) === subscription.variantId)
          : null;
        const price = Number(variant?.price ?? product.salesPrice ?? product.unitPrice ?? subscription.priceSnapshot ?? 0);
        return {
          item: product._id,
          itemCode: product.itemCode,
          itemName: product.itemName,
          itemDescription: product.description || "",
          imageUrl: product.images?.[0] || product.imageUrl || "",
          quantity: subscription.quantity,
          orderedQuantity: subscription.quantity,
          unitPrice: price,
          priceAfterDiscount: price,
          totalAmount: price * subscription.quantity,
          selectedVariantId: subscription.variantId || null,
        };
      });
      const total = items.reduce((sum, item) => sum + item.totalAmount, 0);
      const address = customer.shippingAddresses?.[first.addressIndex] || customer.shippingAddresses?.[0] || {};
      await SalesOrder.create({
        companyId: first.companyId,
        customer: first.customerId,
        customerCode: customer.customerCode || `MOB-${customer.mobilePhone}`,
        customerName: customer.customerName,
        documentNumberOrder: `SO-SUB-${targetKey.replaceAll("-", "")}-${String(first.customerId).slice(-6).toUpperCase()}`,
        subscriptionRunKey: runKey,
        items,
        totalBeforeDiscount: total,
        grandTotal: total,
        openBalance: total,
        deliveryCharge: 0,
        paymentMethod: "cod",
        paymentStatus: "pending",
        source: "subscription",
        status: "Open",
        shippingAddress: {
          fullName: address.fullName || customer.customerName,
          phone: address.phone || customer.mobilePhone || "",
          address1: address.address1 || "",
          address2: address.address2 || "",
          city: address.city || "",
          state: address.state || "",
          zip: address.pin || "",
          country: address.country || "India",
        },
        orderDate: new Date(`${targetKey}T00:00:00+05:30`),
        postingDate: new Date(),
        documentDate: new Date(),
        expectedDeliveryDate: new Date(`${targetKey}T08:00:00+05:30`),
        estimatedDelivery: new Date(`${targetKey}T08:00:00+05:30`),
        statusHistory: [{ status: "confirmed", note: "Created from daily plan", changedBy: "system" }],
      });
      created += 1;
    }
    return NextResponse.json({ success: true, deliveryDate: targetKey, created, skipped, subscriptions: due.length });
  } catch (error) {
    console.error("[daily-subscription-orders]", error);
    return NextResponse.json({ message: "Daily order generation failed", error: error.message }, { status: 500 });
  }
}
