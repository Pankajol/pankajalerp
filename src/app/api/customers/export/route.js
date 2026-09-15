import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const csvCell = (value) => {
  let normalized = String(value ?? "");
  if (/^[=+@]/.test(normalized) || /^-\D/.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
};
const columns = [
  ["Customer Code", "customerCode"], ["Customer Name", "customerName"], ["Customer Group", "customerGroup"],
  ["Customer Type", "customerType"], ["Email", "emailId"], ["Mobile Number", "mobileNumber"],
  ["GST Number", "gstNumber"], ["GST Category", "gstCategory"], ["PAN", "pan"],
  ["Contact Person", "contactPersonName"], ["Commission Rate", "commissionRate"], ["Payment Terms", "paymentTerms"],
  ["Billing Address 1", "billingAddress1"], ["Billing Address 2", "billingAddress2"], ["Billing City", "billingCity"],
  ["Billing State", "billingState"], ["Billing PIN", "billingPin"], ["Billing Country", "billingCountry"],
  ["Shipping Address 1", "shippingAddress1"], ["Shipping Address 2", "shippingAddress2"], ["Shipping City", "shippingCity"],
  ["Shipping State", "shippingState"], ["Shipping PIN", "shippingPin"], ["Shipping Country", "shippingCountry"],
  ["GL Account", "glAccount"],
];

export async function GET(req) {
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!["view", "read", "download", "export"].some((action) => hasPermission(user, "Customers", action))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const customerType = searchParams.get("customerType")?.trim() || "";
    const query = { companyId: user.companyId };
    if (customerType && customerType !== "All") query.customerType = customerType;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { customerName: { $regex: safe, $options: "i" } }, { customerCode: { $regex: safe, $options: "i" } },
        { emailId: { $regex: safe, $options: "i" } }, { mobileNumber: { $regex: safe, $options: "i" } },
      ];
    }
    const customers = await Customer.find(query).populate("glAccount", "name code").sort({ createdAt: -1 }).lean();
    const rows = customers.map((customer) => {
      const billing = customer.billingAddresses?.[0] || {};
      const shipping = customer.shippingAddresses?.[0] || {};
      return { ...customer, glAccount: customer.glAccount?.name || "",
        billingAddress1: billing.address1, billingAddress2: billing.address2, billingCity: billing.city, billingState: billing.state, billingPin: billing.pin, billingCountry: billing.country,
        shippingAddress1: shipping.address1, shippingAddress2: shipping.address2, shippingCity: shipping.city, shippingState: shipping.state, shippingPin: shipping.pin, shippingCountry: shipping.country,
      };
    });
    const csv = [columns.map(([label]) => label), ...rows.map((row) => columns.map(([, key]) => row[key]))].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(`\uFEFF${csv}`, { headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="customers_${date}.csv"`,
      "Cache-Control": "no-store", "X-Exported-Count": String(customers.length),
    }});
  } catch (error) {
    console.error("Customer export error:", error);
    return NextResponse.json({ success: false, message: "Failed to download customers" }, { status: 500 });
  }
}
