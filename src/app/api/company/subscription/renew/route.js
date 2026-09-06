import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET?.trim();

console.log("RAZORPAY_KEY_ID exists?", !!RAZORPAY_KEY_ID);
console.log("RAZORPAY_SECRET exists?", !!RAZORPAY_SECRET);

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_SECRET,
  });
} catch (err) {
  console.error("❌ Failed to initialize Razorpay:", err.message);
}

const PRICES = {
  starter: { monthly: 2, yearly: 3 },
  growth: { monthly: 3, yearly: 4 },
};

export async function POST(req) {
  try {
    // ─── Authentication ──────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized – token missing" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("JWT verify error:", err.message);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const companyId = decoded.companyId || decoded.id;

    // ─── Request body ─────────────────────────────────────
    const body = await req.json();
    let { planId, planType, paymentMethod } = body;

    // ─── Connect to DB ────────────────────────────────────
    await dbConnect();
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // ─── Fallback to current plan ────────────────────────
    if (!planId) planId = company.plan || "starter";
    if (!planType) planType = company.planType || "monthly";
    if (!paymentMethod) paymentMethod = "manual";

    const amount = PRICES[planId]?.[planType];
    if (!amount) {
      return NextResponse.json({ error: `Invalid plan: ${planId} ${planType}` }, { status: 400 });
    }

    // ─── If paymentMethod is NOT razorpay, skip Razorpay ──
    if (paymentMethod !== "razorpay") {
      // Update subscription directly
      company.plan = planId;
      company.planType = planType;
      company.currentPeriodStart = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + (planType === "yearly" ? 12 : 1));
      company.currentPeriodEnd = end;
      company.subscriptionStatus = "active";
      company.cancelAtPeriodEnd = false;
      // Clear any old Razorpay references
      company.razorpaySubscriptionId = null;
      company.razorpayPlanId = null;
      await company.save();

      return NextResponse.json({
        success: true,
        message: `Subscription updated to ${planId} ${planType} via ${paymentMethod}`,
      });
    }

    // ─── Razorpay flow ──────────────────────────────────
    // Validate keys
    if (!RAZORPAY_KEY_ID || !RAZORPAY_SECRET) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 400 });
    }

    // Cancel old subscription if exists
    if (company.razorpaySubscriptionId) {
      try {
        await razorpay.subscriptions.cancel(company.razorpaySubscriptionId, {
          cancel_at_cycle_end: 1,
        });
        console.log("✅ Old subscription cancelled:", company.razorpaySubscriptionId);
      } catch (err) {
        console.log("⚠️ Old subscription cancel error (ignored):", err.message);
      }
    }

    // Create plan
    let plan;
    try {
      plan = await razorpay.plans.create({
        period: planType === "monthly" ? "monthly" : "yearly",
        interval: 1,
        item: {
          name: `${planId} ${planType} – ${company.companyName}`,
          amount: amount * 100,
          currency: "INR",
        },
      });
      console.log("✅ Razorpay plan created:", plan.id);
    } catch (err) {
      console.error("❌ Razorpay plan creation error:", err);
      return NextResponse.json(
        { error: `Razorpay plan creation failed: ${err.message}` },
        { status: 500 }
      );
    }

    // Create subscription
    let subscription;
    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: plan.id,
        customer_notify: 1,
        total_count: planType === "monthly" ? 12 : 1,
        notes: { companyId: company._id.toString() },
      });
      console.log("✅ Razorpay subscription created:", subscription.id);
    } catch (err) {
      console.error("❌ Razorpay subscription creation error:", err);
      return NextResponse.json(
        { error: `Razorpay subscription creation failed: ${err.message}` },
        { status: 500 }
      );
    }

    // Update company
    company.razorpaySubscriptionId = subscription.id;
    company.razorpayPlanId = plan.id;
    company.plan = planId;
    company.planType = planType;
    company.currentPeriodStart = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + (planType === "yearly" ? 12 : 1));
    company.currentPeriodEnd = end;
    company.subscriptionStatus = "active";
    company.cancelAtPeriodEnd = false;
    await company.save();

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      amount,
      currency: "INR",
      companyName: company.companyName,
      contactName: company.contactName,
      email: company.email,
    });
  } catch (err) {
    console.error("🔥 Renew error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}