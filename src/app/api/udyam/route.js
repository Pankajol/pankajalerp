import axios from "axios";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const UDYAM_PATTERN = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
const DEMO_UDYAM_NUMBER = "UDYAM-MH-01-0000001";

const DEMO_UDYAM = {
  entity: "Aarav Industrial Supplies Pvt Ltd",
  type: "Manufacturer",
  majorActivity: ["Manufacturing", "Industrial components"],
  incorporated: "2019-04-12",
  valid: true,
  gstNumber: "27AABCA1234F1Z5",
  gstCategory: "Registered Regular",
  pan: "AABCA1234F",
  bankName: "State Bank of India",
  branch: "Andheri East, Mumbai",
  bankAccountNumber: "12345678901",
  ifscCode: "SBIN0001234",
  officialAddress: {
    unitNumber: "Unit 12",
    building: "Sapphire Industrial Estate",
    road: "MIDC Road",
    villageOrTown: "Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400093",
    maskedMobile: "9876543210",
    maskedEmail: "accounts@aaravindustrial.in",
  },
};

function normalizeDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizeUdyam(payload = {}) {
  const source = payload.data && typeof payload.data === "object" ? payload.data : payload;
  const address = source.officialAddress || source.address || {};
  const activities = source.majorActivity || source.activities || source.activity;

  return {
    entity: source.entity || source.enterpriseName || source.name || "",
    type: source.type || source.organisationType || "",
    majorActivity: Array.isArray(activities) ? activities : activities ? [String(activities)] : [],
    incorporated: normalizeDate(source.incorporated || source.incorporationDate || source.dateOfCommencement),
    valid: source.valid ?? source.isValid ?? true,
    gstNumber: source.gstNumber || source.gstin || "",
    gstCategory: source.gstCategory || "",
    pan: source.pan || "",
    bankName: source.bankName || "",
    branch: source.branch || "",
    bankAccountNumber: source.bankAccountNumber || "",
    ifscCode: source.ifscCode || "",
    officialAddress: {
      unitNumber: address.unitNumber || address.flat || "",
      building: address.building || address.premises || "",
      road: address.road || address.street || "",
      villageOrTown: address.villageOrTown || address.locality || "",
      city: address.city || address.district || "",
      state: address.state || "",
      zip: String(address.zip || address.pin || address.pincode || ""),
      maskedMobile: address.maskedMobile || source.mobile || "",
      maskedEmail: address.maskedEmail || source.email || "",
    },
  };
}

export async function POST(req) {
  try {
    const token = getTokenFromHeader(req);
    const user = token ? verifyJWT(token) : null;
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please sign in to verify an Udyam registration." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const udyamNumber = String(body?.udyamNumber || "").trim().toUpperCase();
    if (!UDYAM_PATTERN.test(udyamNumber)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid number such as UDYAM-MH-01-0000001." },
        { status: 400 }
      );
    }

    if (udyamNumber === DEMO_UDYAM_NUMBER) {
      return NextResponse.json({ success: true, data: DEMO_UDYAM, demo: true });
    }

    const credential = process.env.ATTESTR_UDYAM_AUTH;
    if (!credential) {
      return NextResponse.json(
        {
          success: false,
          message: `Live Udyam verification is not configured. Use ${DEMO_UDYAM_NUMBER} for the demo flow.`,
        },
        { status: 503 }
      );
    }

    const response = await axios.post(
      "https://api.attestr.com/api/v2/public/corpx/udyam",
      { reg: udyamNumber },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
          Authorization: credential.startsWith("Basic ") ? credential : `Basic ${credential}`,
        },
      }
    );

    return NextResponse.json({ success: true, data: normalizeUdyam(response.data) });
  } catch (error) {
    const status = error.response?.status || 500;
    const providerMessage = error.response?.data?.message || error.response?.data?.error;
    console.error("Udyam verification error:", providerMessage || error.message);
    return NextResponse.json(
      {
        success: false,
        message: providerMessage || (status >= 500 ? "Udyam verification is temporarily unavailable." : "Udyam registration could not be verified."),
      },
      { status }
    );
  }
}
