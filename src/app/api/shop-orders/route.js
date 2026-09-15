import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";
import crypto from "crypto";
import DeliveryPartner from "@/models/DeliveryPartner";
import Company from "@/models/Company";

const STATUSES = ["Open", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refund_pending", "refunded"];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const indiaDay = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);

function getCompanyUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const user = verifyJWT(token);
  if (!user?.companyId) return null;
  const roles = Array.isArray(user.roles) ? user.roles.map((role) => String(role).toLowerCase()) : [];
  const allowed = user.type === "company" || roles.some((role) =>
    ["admin", "sales manager", "inventory manager", "support executive"].includes(role)
  );
  return allowed ? user : null;
}

export async function GET(req) {
  try {
    const user = getCompanyUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const storefrontOrder = { $or: [
      { source: { $in: ["mobile", "subscription"] } },
      { documentNumberOrder: { $regex: /^SO-(MOB|SUB)-/ } },
    ] };
    const query = { companyId: user.companyId, $and: [storefrontOrder] };
    const period = searchParams.get("period") || "all";
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search")?.trim();

    if (period === "today") {
      const [year, month, day] = indiaDay().split("-").map(Number);
      const start = new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
      query.createdAt = { $gte: start, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    }
    if (status !== "all") query.status = status;
    if (search) query.$and.push({
      $or: [
        { documentNumberOrder: { $regex: escapeRegex(search), $options: "i" } },
        { customerName: { $regex: escapeRegex(search), $options: "i" } },
      ],
    });

    const [orders, allOrders, partners, company] = await Promise.all([
      SalesOrder.find(query).sort({ createdAt: -1 }).limit(300).lean(),
      SalesOrder.find({ companyId: user.companyId, ...storefrontOrder })
        .select("status grandTotal createdAt")
        .lean(),
      DeliveryPartner.find({ companyId: user.companyId, active: true }).select("name phone vehicleNumber active").sort({ name: 1 }).lean(),
      Company.findById(user.companyId).select("companyName slug").lean(),
    ]);
    const today = indiaDay();
    const stats = allOrders.reduce((result, order) => {
      result.total += 1;
      result.revenue += String(order.status).toLowerCase() === "cancelled" ? 0 : Number(order.grandTotal || 0);
      if (indiaDay(order.createdAt) === today) result.today += 1;
      if (!["delivered", "cancelled"].includes(String(order.status).toLowerCase())) result.active += 1;
      return result;
    }, { total: 0, today: 0, active: 0, revenue: 0 });

    return NextResponse.json({ orders, stats, partners, store: company ? { name: company.companyName, slug: company.slug } : null });
  } catch (error) {
    console.error("[shop-orders GET]", error);
    return NextResponse.json({ message: "Unable to load shop orders" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = getCompanyUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await dbConnect();

    const body = await req.json();
    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId)) {
      return NextResponse.json({ message: "Valid order ID is required" }, { status: 400 });
    }
    if (body.status && !STATUSES.includes(body.status)) {
      return NextResponse.json({ message: "Invalid order status" }, { status: 400 });
    }
    if (body.paymentStatus && !PAYMENT_STATUSES.includes(body.paymentStatus)) {
      return NextResponse.json({ message: "Invalid payment status" }, { status: 400 });
    }

    const order = await SalesOrder.findOne({
      _id: body.orderId,
      companyId: user.companyId,
      $or: [
        { source: { $in: ["mobile", "subscription"] } },
        { documentNumberOrder: { $regex: /^SO-(MOB|SUB)-/ } },
      ],
    });
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
    if (String(order.status).toLowerCase() === "cancelled" && body.status !== "Cancelled") {
      return NextResponse.json({ message: "A cancelled order cannot be reopened" }, { status: 409 });
    }

    const previousStatus = order.status;
    if (body.status) order.status = body.status;
    if (body.paymentStatus) order.paymentStatus = body.paymentStatus;
    if (body.courierName !== undefined) order.courierName = String(body.courierName).trim();
    if (body.trackingNumber !== undefined) order.trackingNumber = String(body.trackingNumber).trim();
    if (body.estimatedDelivery !== undefined) {
      order.estimatedDelivery = body.estimatedDelivery ? new Date(body.estimatedDelivery) : null;
    }
    if (body.deliveryPartnerId !== undefined) {
      if (!body.deliveryPartnerId || !mongoose.Types.ObjectId.isValid(body.deliveryPartnerId)) {
        return NextResponse.json({ message: "Choose a valid delivery partner" }, { status: 400 });
      }
      const partner = await DeliveryPartner.findOne({ _id: body.deliveryPartnerId, companyId: user.companyId, active: true });
      if (!partner) return NextResponse.json({ message: "Delivery partner not found" }, { status: 404 });
      if (!["packed", "shipped", "out for delivery"].includes(String(order.status).toLowerCase())) {
        return NextResponse.json({ message: "Pack the order before assigning a delivery partner" }, { status: 409 });
      }
      order.deliveryAssignment = {
        partnerId: partner._id,
        partnerName: partner.name,
        partnerPhone: partner.phone,
        vehicleNumber: partner.vehicleNumber,
        status: "assigned",
        assignedAt: new Date(),
      };
      order.deliveryOtp = String(crypto.randomInt(1000, 10000));
      order.statusHistory.push({
        status: String(order.status).toLowerCase().replaceAll(" ", "_"),
        note: `Assigned to ${partner.name}`,
        changedBy: "company",
      });
    }
    if (body.status && body.status !== previousStatus) {
      order.statusHistory.push({
        status: body.status.toLowerCase().replaceAll(" ", "_"),
        note: String(body.note || "Status updated by seller").slice(0, 300),
        changedBy: "company",
      });
    }
    if (body.status === "Cancelled" && previousStatus !== "Cancelled") {
      order.cancelledAt = new Date();
      order.cancelledBy = "company";
      order.cancellationReason = String(body.note || "Cancelled by seller").slice(0, 300);
      order.openBalance = 0;
      if (order.paymentStatus === "paid") order.paymentStatus = "refund_pending";
    }
    await order.save();

    return NextResponse.json({ order, message: "Order updated successfully" });
  } catch (error) {
    console.error("[shop-orders PATCH]", error);
    return NextResponse.json({ message: "Unable to update order", error: error.message }, { status: 500 });
  }
}
