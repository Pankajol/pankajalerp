import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const getPartner = (req) => {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const user = verifyJWT(token);
  return user?.type === "delivery_partner" ? user : null;
};

const mapOrder = (order) => ({
  _id: order._id,
  orderNumber: order.documentNumberOrder,
  customerName: order.customerName,
  status: order.status,
  assignment: order.deliveryAssignment,
  items: (order.items || []).map((item) => ({ name: item.itemName, quantity: item.quantity || item.orderedQuantity, unit: item.unit || "piece" })),
  itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || item.orderedQuantity || 0), 0),
  totalAmount: order.grandTotal,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  address: order.shippingAddress,
  customerPhone: order.shippingAddress?.phone || "",
  estimatedDelivery: order.estimatedDelivery,
  placedAt: order.createdAt,
});

export async function GET(req) {
  const partner = getPartner(req);
  if (!partner) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const orders = await SalesOrder.find({
    companyId: partner.companyId,
    "deliveryAssignment.partnerId": partner.id,
    status: { $ne: "Cancelled" },
  }).sort({ "deliveryAssignment.deliveredAt": 1, createdAt: 1 }).lean();
  return NextResponse.json({ orders: orders.map(mapOrder) });
}
