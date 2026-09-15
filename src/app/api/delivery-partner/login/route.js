import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import DeliveryPartner from "@/models/DeliveryPartner";
import { resolveStoreCompany } from "@/lib/resolveStoreCompany";
import { signToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const { companySlug, phone: rawPhone, pin } = await req.json();
    const phone = String(rawPhone || "").replace(/\D/g, "");
    if (!companySlug || !/^\d{10}$/.test(phone) || !/^\d{4}$/.test(String(pin || ""))) {
      return NextResponse.json({ message: "Store, phone and 4-digit PIN are required" }, { status: 400 });
    }
    await dbConnect();
    const company = await resolveStoreCompany(companySlug);
    if (!company) return NextResponse.json({ message: "Store not found" }, { status: 404 });
    const partner = await DeliveryPartner.findOne({ companyId: company._id, phone, active: true }).select("+pinHash");
    if (!partner || !(await bcrypt.compare(String(pin), partner.pinHash))) {
      return NextResponse.json({ message: "Phone or PIN is incorrect" }, { status: 401 });
    }
    partner.lastSeenAt = new Date();
    await partner.save();
    const token = signToken({
      _id: partner._id, name: partner.name, type: "delivery_partner", companyId: company._id,
      role: { name: "delivery_partner" }, permissions: {}, modules: {},
    });
    return NextResponse.json({ token, partner: { _id: partner._id, name: partner.name, phone, vehicleNumber: partner.vehicleNumber, companyName: company.companyName } });
  } catch (error) {
    return NextResponse.json({ message: "Could not sign in", error: error.message }, { status: 500 });
  }
}
