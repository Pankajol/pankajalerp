import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

const getPartner = (req) => {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const user = verifyJWT(token);
  return user?.type === "delivery_partner" ? user : null;
};

const actionConfig = {
  accept: { from: ["assigned"], status: "accepted", field: "acceptedAt", note: "Delivery accepted by partner" },
  pickup: { from: ["assigned", "accepted"], status: "picked_up", field: "pickedUpAt", note: "Order picked up and out for delivery", orderStatus: "Out for Delivery" },
  arrive: { from: ["picked_up"], status: "arrived", field: "arrivedAt", note: "Delivery partner has arrived" },
};

export async function PATCH(req, { params }) {
  try {
    const partner = getPartner(req);
    if (!partner) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ message: "Invalid order" }, { status: 400 });
    const body = await req.json();
    await dbConnect();
    const order = await SalesOrder.findOne({ _id: id, companyId: partner.companyId, "deliveryAssignment.partnerId": partner.id }).select("+deliveryOtp");
    if (!order) return NextResponse.json({ message: "Delivery not found" }, { status: 404 });
    if (["Delivered", "Cancelled"].includes(order.status)) return NextResponse.json({ message: "This delivery is already closed" }, { status: 409 });
    const current = order.deliveryAssignment?.status || "assigned";

    if (body.action === "deliver") {
      if (!["picked_up", "arrived"].includes(current)) return NextResponse.json({ message: "Pick up the order before completing delivery" }, { status: 409 });
      if (String(body.otp || "") !== String(order.deliveryOtp || "")) return NextResponse.json({ message: "Incorrect customer OTP" }, { status: 400 });
      if (order.paymentMethod === "cod" && body.codCollected !== true) return NextResponse.json({ message: "Confirm cash collection to complete this COD order" }, { status: 400 });
      order.deliveryAssignment.status = "delivered";
      order.deliveryAssignment.deliveredAt = new Date();
      order.deliveryAssignment.codCollected = body.codCollected === true;
      order.deliveryAssignment.proofNote = String(body.proofNote || "OTP verified").slice(0, 200);
      order.status = "Delivered";
      if (order.paymentMethod === "cod") { order.paymentStatus = "paid"; order.openBalance = 0; }
      order.statusHistory.push({ status: "delivered", note: "Delivered successfully with customer OTP", changedBy: `partner:${partner.id}` });
    } else if (body.action === "failed") {
      const reason = String(body.reason || "").trim();
      if (reason.length < 3) return NextResponse.json({ message: "Add a reason for the failed attempt" }, { status: 400 });
      order.deliveryAssignment.status = "failed";
      order.deliveryAssignment.failedAt = new Date();
      order.deliveryAssignment.failureReason = reason.slice(0, 200);
      order.statusHistory.push({ status: "out_for_delivery", note: `Delivery attempt failed: ${reason}`, changedBy: `partner:${partner.id}` });
    } else {
      const config = actionConfig[body.action];
      if (!config) return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
      if (!config.from.includes(current)) return NextResponse.json({ message: "This action is not available now" }, { status: 409 });
      order.deliveryAssignment.status = config.status;
      order.deliveryAssignment[config.field] = new Date();
      if (config.orderStatus) order.status = config.orderStatus;
      order.statusHistory.push({ status: config.orderStatus ? "out_for_delivery" : config.status, note: config.note, changedBy: `partner:${partner.id}` });
    }
    await order.save();
    return NextResponse.json({ message: "Delivery updated", status: order.status, assignment: order.deliveryAssignment });
  } catch (error) {
    return NextResponse.json({ message: "Could not update delivery", error: error.message }, { status: 500 });
  }
}
