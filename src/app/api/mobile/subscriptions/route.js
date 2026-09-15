import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import DeliverySubscription from "@/models/DeliverySubscription";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const TIME_ZONE = "Asia/Kolkata";
const toIndiaDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const addDays = (date, count) => new Date(date.getTime() + count * 86400000);
const weekdayNumber = (date) => {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
};

function getCustomer(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const user = verifyJWT(token);
  return user?.type === "customer" && user.companyId ? user : null;
}

function runsOn(subscription, date) {
  if (subscription.status !== "active") return false;
  const dateKey = toIndiaDate(date);
  if ((subscription.skipDates || []).includes(dateKey)) return false;
  if (subscription.frequency === "daily") return true;
  if (subscription.frequency === "custom") {
    return (subscription.weekdays || []).includes(weekdayNumber(date));
  }
  const start = new Date(`${toIndiaDate(subscription.startDate)}T00:00:00+05:30`);
  const target = new Date(`${dateKey}T00:00:00+05:30`);
  return Math.floor((target - start) / 86400000) % 2 === 0;
}

const mapSubscription = (subscription) => {
  const product = subscription.productId || {};
  return {
    _id: subscription._id,
    productId: product._id,
    name: product.itemName || "Product",
    image: product.images?.[0] || product.imageUrl || "",
    unit: product.uom || product.stockUom || product.unit || "piece",
    quantity: subscription.quantity,
    frequency: subscription.frequency,
    weekdays: subscription.weekdays || [],
    timeSlot: subscription.timeSlot,
    status: subscription.status,
    price: Number(subscription.priceSnapshot || product.salesPrice || product.unitPrice || 0),
    skipDates: subscription.skipDates || [],
  };
};

export async function GET(req) {
  try {
    const user = getCustomer(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const subscriptions = await DeliverySubscription.find({
      companyId: user.companyId,
      customerId: user.id,
      status: { $ne: "cancelled" },
    }).populate("productId", "itemName images imageUrl uom stockUom unit salesPrice unitPrice active status").sort({ createdAt: 1 }).lean();

    const mapped = subscriptions.map(mapSubscription);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(new Date(), index);
      const items = subscriptions.filter((subscription) => runsOn(subscription, date)).map(mapSubscription);
      return { date: toIndiaDate(date), items, total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) };
    });
    return NextResponse.json({ subscriptions: mapped, schedule: days, nextDelivery: days.slice(1).find((day) => day.items.length) || null });
  } catch (error) {
    console.error("[mobile/subscriptions GET]", error);
    return NextResponse.json({ message: "Unable to load daily plan" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getCustomer(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const body = await req.json();
    if (!mongoose.Types.ObjectId.isValid(body.productId)) {
      return NextResponse.json({ message: "Invalid product" }, { status: 400 });
    }
    const quantity = Number(body.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ message: "Quantity must be between 1 and 99" }, { status: 400 });
    }
    const frequency = ["daily", "alternate", "custom"].includes(body.frequency) ? body.frequency : "daily";
    const weekdays = frequency === "custom"
      ? [...new Set((body.weekdays || []).map(Number).filter((day) => day >= 0 && day <= 6))]
      : [];
    if (frequency === "custom" && !weekdays.length) {
      return NextResponse.json({ message: "Choose at least one delivery day" }, { status: 400 });
    }
    const product = await Item.findOne({ _id: body.productId, companyId: user.companyId, active: { $ne: false }, status: { $ne: "inactive" } }).lean();
    if (!product) return NextResponse.json({ message: "Product is unavailable" }, { status: 404 });
    const variant = body.variantId ? (product.variants || []).find((item) => String(item._id) === String(body.variantId)) : null;
    if (body.variantId && !variant) return NextResponse.json({ message: "Product option is unavailable" }, { status: 400 });
    const available = Number(variant?.quantity ?? product.stockQuantity ?? product.quantity ?? 0);
    if (quantity > available) return NextResponse.json({ message: `Only ${available} unit(s) are available` }, { status: 409 });
    const price = Number(variant?.price ?? product.salesPrice ?? product.unitPrice ?? 0);

    const subscription = await DeliverySubscription.findOneAndUpdate(
      { companyId: user.companyId, customerId: user.id, productId: product._id, variantId: body.variantId || "" },
      { $set: { quantity, frequency, weekdays, timeSlot: body.timeSlot || "6-8 AM", addressIndex: Number(body.addressIndex || 0), status: "active", priceSnapshot: price, pausedAt: null, cancelledAt: null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("productId", "itemName images imageUrl uom stockUom unit salesPrice unitPrice");
    return NextResponse.json({ subscription: mapSubscription(subscription.toObject()), message: "Daily plan saved" });
  } catch (error) {
    console.error("[mobile/subscriptions POST]", error);
    return NextResponse.json({ message: error.code === 11000 ? "This item is already in your plan" : "Unable to save daily plan", error: error.message }, { status: error.code === 11000 ? 409 : 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = getCustomer(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const body = await req.json();
    if (!mongoose.Types.ObjectId.isValid(body.subscriptionId)) {
      return NextResponse.json({ message: "Invalid daily plan" }, { status: 400 });
    }
    const subscription = await DeliverySubscription.findOne({ _id: body.subscriptionId, companyId: user.companyId, customerId: user.id });
    if (!subscription) return NextResponse.json({ message: "Daily plan not found" }, { status: 404 });

    if (body.action === "pause") { subscription.status = "paused"; subscription.pausedAt = new Date(); }
    else if (body.action === "resume") { subscription.status = "active"; subscription.pausedAt = null; }
    else if (body.action === "skip") {
      const date = body.date || toIndiaDate(addDays(new Date(), 1));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ message: "Invalid skip date" }, { status: 400 });
      if (!subscription.skipDates.includes(date)) subscription.skipDates.push(date);
    } else if (body.action === "unskip") subscription.skipDates = subscription.skipDates.filter((date) => date !== body.date);
    else if (body.action === "cancel") { subscription.status = "cancelled"; subscription.cancelledAt = new Date(); }
    else if (body.action === "update") {
      if (body.quantity !== undefined) {
        const quantity = Number(body.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return NextResponse.json({ message: "Invalid quantity" }, { status: 400 });
        const product = await Item.findOne({ _id: subscription.productId, companyId: user.companyId }).select("stockQuantity quantity variants").lean();
        const variant = subscription.variantId ? (product?.variants || []).find((item) => String(item._id) === subscription.variantId) : null;
        const available = Number(variant?.quantity ?? product?.stockQuantity ?? product?.quantity ?? 0);
        if (quantity > available) return NextResponse.json({ message: `Only ${available} unit(s) are available` }, { status: 409 });
        subscription.quantity = quantity;
      }
      if (["daily", "alternate", "custom"].includes(body.frequency)) subscription.frequency = body.frequency;
      if (Array.isArray(body.weekdays)) subscription.weekdays = [...new Set(body.weekdays.map(Number).filter((day) => day >= 0 && day <= 6))];
      if (["6-8 AM", "8-10 AM", "5-7 PM"].includes(body.timeSlot)) subscription.timeSlot = body.timeSlot;
    } else return NextResponse.json({ message: "Unsupported daily-plan action" }, { status: 400 });

    await subscription.save();
    return NextResponse.json({ message: "Daily plan updated" });
  } catch (error) {
    console.error("[mobile/subscriptions PATCH]", error);
    return NextResponse.json({ message: "Unable to update daily plan", error: error.message }, { status: 500 });
  }
}
