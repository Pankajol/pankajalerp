import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import DeliveryPartner from "@/models/DeliveryPartner";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function companyUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const user = verifyJWT(token);
  return user?.companyId && user.type !== "customer" && user.type !== "delivery_partner" ? user : null;
}

export async function GET(req) {
  const user = companyUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const partners = await DeliveryPartner.find({ companyId: user.companyId }).sort({ active: -1, name: 1 }).lean();
  return NextResponse.json({ partners });
}

export async function POST(req) {
  try {
    const user = companyUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").replace(/\D/g, "");
    const pin = String(body.pin || "");
    if (name.length < 2 || !/^\d{10}$/.test(phone) || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ message: "Enter a name, 10-digit phone and 4-digit login PIN" }, { status: 400 });
    }
    await dbConnect();
    const pinHash = await bcrypt.hash(pin, 10);
    const partner = await DeliveryPartner.findOneAndUpdate(
      { companyId: user.companyId, phone },
      { name, phone, pinHash, vehicleNumber: String(body.vehicleNumber || "").trim().toUpperCase(), active: true },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ partner, message: "Delivery partner is ready" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.code === 11000 ? "This phone is already registered" : "Could not save delivery partner" }, { status: error.code === 11000 ? 409 : 500 });
  }
}
