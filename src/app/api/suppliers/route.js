import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import AccountHead from "@/models/accounts/AccountHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------- Helpers -------------------
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.role === "Admin" || user.role === "admin") return true;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (roles.includes("Admin") || roles.includes("admin")) return true;
  if (roles.includes("masters")) return true;
  if (roles.includes("Purchase Manager")) return true;
  const modules = user.modules || {};
  if (modules["Suppliers"]?.selected) return true;
  return false;
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "No token", status: 401 };
  const decoded = verifyJWT(token);
  if (!decoded) return { error: "Invalid token", status: 401 };
  if (!isAuthorized(decoded)) return { error: "Forbidden", status: 403 };
  return { user: decoded, error: null };
}

async function uploadToCloudinary(fileBuffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "suppliers",
        resource_type: "auto",
        public_id: `${Date.now()}_${originalName.replace(/\s/g, "_")}`,
      },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    uploadStream.end(fileBuffer);
  });
}

async function parseMultipart(req) {
  const formData = await req.formData();
  const files = formData.getAll("attachments").filter(f => f && f.size > 0);
  const dataField = formData.get("data");
  let supplierData = dataField ? JSON.parse(dataField) : {};
  return { files, supplierData };
}

// ------------------- GET /api/suppliers -------------------
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Get single supplier (for editing)
    if (id) {
      const supplier = await Supplier.findOne({ _id: id, companyId: user.companyId })
        .populate("glAccount", "name code type group")
        .lean();
      if (!supplier) {
        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: supplier });
    }

    // Paginated list
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search")?.trim() || "";
    const supplierType = searchParams.get("supplierType");

    const query = { companyId: user.companyId };
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { supplierName: { $regex: safeSearch, $options: "i" } },
        { supplierCode: { $regex: safeSearch, $options: "i" } },
        { supplierGroup: { $regex: safeSearch, $options: "i" } },
        { supplierCategory: { $regex: safeSearch, $options: "i" } },
        { contactPersonName: { $regex: safeSearch, $options: "i" } },
        { emailId: { $regex: safeSearch, $options: "i" } },
        { mobileNumber: { $regex: safeSearch, $options: "i" } },
        { gstNumber: { $regex: safeSearch, $options: "i" } },
        { pan: { $regex: safeSearch, $options: "i" } },
        { udyamNumber: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (supplierType && supplierType !== "All") {
      query.supplierType = supplierType;
    }

    const skip = (page - 1) * limit;
    const [suppliers, total, typeCounts] = await Promise.all([
      Supplier.find(query)
        .select("supplierName supplierCode supplierCategory emailId mobileNumber contactPersonName supplierType supplierGroup valid udyamNumber gstNumber glAccount createdAt")
        .populate("glAccount", "name code type group")
        .sort({ createdAt: -1, supplierName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(query),
      Supplier.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(user.companyId) } },
        { $group: { _id: "$supplierType", count: { $sum: 1 } } },
      ]),
    ]);

    const stats = typeCounts.reduce(
      (acc, item) => {
        if (item._id === "Manufacturer") acc.manufacturer = item.count;
        if (item._id === "Distributor") acc.distributor = item.count;
        if (item._id === "Wholesaler") acc.wholesaler = item.count;
        if (item._id === "Service Provider") acc.service = item.count;
        acc.total += item.count;
        return acc;
      },
      { total: 0, manufacturer: 0, distributor: 0, wholesaler: 0, service: 0 }
    );

    return NextResponse.json({
      success: true,
      data: suppliers,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), stats },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ------------------- POST /api/suppliers -------------------
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    let supplierData = {};
    let uploadedUrls = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const { files, supplierData: data } = await parseMultipart(req);
      supplierData = data;
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, file.name);
        uploadedUrls.push(url);
      }
    } else {
      supplierData = await req.json();
    }

    if (!supplierData.supplierCode) {
      const latest = await Supplier.findOne({ companyId: user.companyId })
        .select("supplierCode")
        .sort({ supplierCode: -1 })
        .lean();
      const next = parseInt(latest?.supplierCode?.split("-")[1] || "0", 10) + 1;
      supplierData.supplierCode = `SUPP-${String(next).padStart(4, "0")}`;
    }

    // Required business fields
    if (!supplierData.supplierName || !supplierData.supplierType || !supplierData.supplierGroup || !supplierData.emailId || !supplierData.pan || !supplierData.gstCategory) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Check duplicate code
    const existing = await Supplier.findOne({
      supplierCode: supplierData.supplierCode,
      companyId: user.companyId,
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
    }

    // Auto create GL account (Liability)
   // Auto create GL account (Liability)
let glAccountId = supplierData.glAccount;

if (!glAccountId) {

  let account = await AccountHead.findOne({
    companyId: user.companyId,
    name: supplierData.supplierName,
    type: "Liability",
  });

  if (!account) {

    const accountCode = `SUP-${Date.now()}`;

    account = await AccountHead.create({
      companyId: user.companyId,
      name: supplierData.supplierName,
      code: accountCode,
      type: "Liability",
      group: "Current Liability",
      balanceType: "Credit",
    });
  }

  glAccountId = account._id;

} else {
  if (!mongoose.Types.ObjectId.isValid(glAccountId)) {
    return NextResponse.json({ success: false, message: "Select a valid GL account." }, { status: 400 });
  }
  const account = await AccountHead.findOne({ _id: glAccountId, companyId: user.companyId, isActive: true });
  if (!account) {
    return NextResponse.json({ success: false, message: "The selected GL account is unavailable." }, { status: 400 });
  }
  glAccountId = account._id;
}

    // Merge attachments
    let existingAttachments = supplierData.attachments || "";
    const oldUrls = existingAttachments ? existingAttachments.split(",").filter(Boolean) : [];
    const allAttachments = [...oldUrls, ...uploadedUrls].join(",");

    const supplier = new Supplier({
      ...supplierData,
      companyId: user.companyId,
      createdBy: user.id,
      glAccount: glAccountId,
      attachments: allAttachments,
    });
    await supplier.save();

    const populated = await Supplier.findById(supplier._id).populate("glAccount", "name code type group");
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    console.error(err);
    const message = err.code === 11000 || err.name === "ValidationError" ? err.message : "Failed to create supplier";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// ------------------- PUT /api/suppliers/[id] -------------------
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 401 });
  }

  try {
    const id = params?.id || new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    }

    let supplierData = {};
    let uploadedUrls = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const { files, supplierData: data } = await parseMultipart(req);
      supplierData = data;
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, file.name);
        uploadedUrls.push(url);
      }
    } else {
      supplierData = await req.json();
    }

    // Merge attachments: existing (from supplierData.attachments) + newly uploaded
    let finalAttachments = supplierData.attachments || "";
    if (uploadedUrls.length) {
      const existingArr = finalAttachments ? finalAttachments.split(",").filter(Boolean) : [];
      finalAttachments = [...existingArr, ...uploadedUrls].join(",");
    }
    supplierData.attachments = finalAttachments;

    // Handle glAccount if provided as object
    if (supplierData.glAccount && typeof supplierData.glAccount === "object") {
      supplierData.glAccount = supplierData.glAccount._id || null;
    }

    const updated = await Supplier.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...supplierData, updatedBy: user.id },
      { new: true, runValidators: true }
    ).populate("glAccount", "accountName accountCode");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

// ------------------- DELETE /api/suppliers/[id] -------------------
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 401 });
  }

  const id = params?.id || new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
  }

  try {
    const deleted = await Supplier.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db.js";
// import Supplier from "@/models/SupplierModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import AccountHead from "@/models/accounts/AccountHead";
// import { v2 as cloudinary } from "cloudinary";

// // ------------------- Cloudinary config -------------------
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Helper: upload a single file to Cloudinary
// async function uploadToCloudinary(fileBuffer, originalName) {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder: "suppliers",
//         resource_type: "auto",
//         public_id: `${Date.now()}_${originalName.replace(/\s/g, "_")}`,
//       },
//       (error, result) => (error ? reject(error) : resolve(result.secure_url))
//     );
//     uploadStream.end(fileBuffer);
//   });
// }

// // Parse multipart form data (files + JSON data field)
// async function parseMultipart(req) {
//   const formData = await req.formData();
//   const files = formData.getAll("attachments").filter(f => f && f.size > 0);
//   const dataField = formData.get("data");
//   let supplierData = dataField ? JSON.parse(dataField) : {};
//   return { files, supplierData };
// }

// // ── Auth helpers (matches your existing JWT structure) ──
// function getToken(req) {
//   let header = null;
//   if (typeof req.headers.get === "function") {
//     header = req.headers.get("authorization") || req.headers.get("Authorization");
//   } else {
//     header = req.headers["authorization"] || req.headers["Authorization"];
//   }
//   if (!header) return null;
//   return header.startsWith("Bearer ") ? header.slice(7) : header;
// }

// function isAuthorized(decoded) {
//   if (!decoded) return false;
//   if (decoded.type === "company") return true;
//   const roles = Array.isArray(decoded.roles) ? decoded.roles : [];
//   if (roles.includes("Admin") || roles.includes("admin")) return true;
//   if (roles.includes("masters")) return true;
//   if (roles.includes("Purchase Manager")) return true;
//   const modules = decoded.modules || {};
//   if (modules["Suppliers"]?.selected) return true;
//   return false;
// }

// async function validateUser(req) {
//   const token = getToken(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const decoded = verifyJWT(token);
//     if (!decoded) return { error: "Invalid token", status: 401 };
//     if (!isAuthorized(decoded)) return { error: "Forbidden", status: 403 };
//     return { user: decoded };
//   } catch (err) {
//     console.error("JWT error:", err.message);
//     return { error: err.message || "Invalid token", status: 401 };
//   }
// }

// // ------------------- GET /api/suppliers -------------------
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const suppliers = await Supplier.find({ companyId: user.companyId })
//       .populate("glAccount", "name code") // ✅ Populate GL account details
//       .sort({ createdAt: -1 });
//     return NextResponse.json({ success: true, data: suppliers }, { status: 200 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to fetch suppliers" }, { status: 500 });
//   }
// }

// // ------------------- POST /api/suppliers -------------------
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     let supplierData = {};
//     let uploadedUrls = [];
//     const contentType = req.headers.get("content-type") || "";

//     // Handle multipart file uploads
//     if (contentType.includes("multipart/form-data")) {
//       const { files, supplierData: data } = await parseMultipart(req);
//       supplierData = data;
//       for (const file of files) {
//         const buffer = Buffer.from(await file.arrayBuffer());
//         const url = await uploadToCloudinary(buffer, file.name);
//         uploadedUrls.push(url);
//       }
//     } else {
//       supplierData = await req.json();
//     }

//     // Validate required fields
//     const required = ["supplierCode", "supplierName", "supplierType", "pan"];
//     for (const field of required) {
//       if (!supplierData[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }


//     // 🔥 Auto create AccountHead for supplier
// const existingAccount = await AccountHead.findOne({
//   companyId: user.companyId,
//   name: supplierData.supplierName,
// });

// let account;

// if (existingAccount) {
//   account = existingAccount;
// } else {
//   account = await AccountHead.create({
//     companyId: user.companyId,
//     name: supplierData.supplierName,
//     type: "Liability",
//     group: "Current Liability",
//     balanceType: "Credit",
//   });
// }
//     // Prevent duplicate supplierCode within same company
//     const existing = await Supplier.findOne({ supplierCode: supplierData.supplierCode, companyId: user.companyId });
//     if (existing) {
//       return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
//     }

//     // Merge existing attachments (if any) with newly uploaded URLs
//     let existingAttachments = supplierData.attachments || "";
//     if (typeof existingAttachments === "string") {
//       existingAttachments = existingAttachments ? existingAttachments.split(",").filter(Boolean) : [];
//     } else {
//       existingAttachments = [];
//     }
//     const allUrls = [...existingAttachments, ...uploadedUrls];
//     supplierData.attachments = allUrls.join(",");

//     const supplier = new Supplier({
//       ...supplierData,
//       companyId: user.companyId,
//       createdBy: user.id,
//       glAccount: account._id, 
//     });
//     await supplier.save();

//     const populated = await Supplier.findById(supplier._id).populate("glAccount", "accountName accountCode");
//     return NextResponse.json({ success: true, data: populated }, { status: 201 });
//   } catch (err) {
//     console.error("POST /suppliers error:", err);
//     if (err.code === 11000) {
//       const field = Object.keys(err.keyValue)[0];
//       return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 400 });
//     }
//     return NextResponse.json({ success: false, message: "Failed to create supplier" }, { status: 500 });
//   }
// }
