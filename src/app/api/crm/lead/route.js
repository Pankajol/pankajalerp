import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/crm/load";


// ========================
// CREATE LEAD
// ========================
export async function POST(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);

    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    // Permission Check
    if (!hasPermission(decoded, "Lead Generation", "create")) {
      return NextResponse.json(
        { message: "Permission denied" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const lead = await Lead.create({
      ...body,
      leadOwner: decoded.id,
      companyId: decoded.companyId,
    });

    return NextResponse.json(lead, {
      status: 201,
    });

  } catch (err) {
    console.error("Lead create error:", err);

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}


// ========================
// GET LEADS
// ========================
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);

    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    // Permission Check
    if (!hasPermission(decoded, "Lead Generation", "view")) {
      return NextResponse.json(
        { message: "Permission denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const filter = {
      companyId: decoded.companyId,
    };

    // Company Users only see their own leads
    if (decoded.type === "user") {
      filter.leadOwner = decoded.id;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
        { organizationName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Lead.countDocuments(filter);

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      leads,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}



// import { NextResponse } from "next/server";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import dbConnect from "@/lib/db";
// import Lead from "@/models/crm/load";

// export async function POST(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return NextResponse.json({ message: "Invalid token" }, { status: 401 });
//     }

//     const body = await req.json();

//     const lead = await Lead.create({
//       ...body,
//       leadOwner: decoded.id,
//       companyId: decoded.companyId,
//     });

//     return NextResponse.json(lead, { status: 201 });
//   } catch (err) {
//     console.error("Lead create error:", err);
//     return NextResponse.json({ message: "Server error" }, { status: 500 });
//   }
// }

// export async function GET(req) {
//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return NextResponse.json({ message: "Invalid token" }, { status: 401 });
//     }

//     await dbConnect();

//     // Parse query parameters
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get("page") || "1", 10);
//     const limit = parseInt(searchParams.get("limit") || "10", 10);
//     const search = searchParams.get("search") || "";
//     const status = searchParams.get("status") || "";

//     // Build filter
//     const filter = { leadOwner: decoded.id, companyId: decoded.companyId };
//     if (status && status !== "All") {
//       filter.status = status;
//     }

//     let query = Lead.find(filter);

//     // Text search if provided
//     if (search.trim()) {
//       // Use $or for partial matches (more flexible than $text)
//       query = query.or([
//         { firstName: { $regex: search, $options: "i" } },
//         { lastName: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//         { mobileNo: { $regex: search, $options: "i" } },
//         { organizationName: { $regex: search, $options: "i" } },
//       ]);
//     }

//     // Count total documents matching filter
//     const total = await Lead.countDocuments(query._conditions);
//     const totalPages = Math.ceil(total / limit);
//     const skip = (page - 1) * limit;

//     const leads = await query
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     return NextResponse.json({
//       leads,
//       totalPages,
//       total,
//       currentPage: page,
//     }, { status: 200 });
//   } catch (error) {
//     console.error("Error in GET /api/crm/lead:", error);
//     return NextResponse.json(
//       { message: "Failed to fetch leads." },
//       { status: 500 }
//     );
//   }
// }