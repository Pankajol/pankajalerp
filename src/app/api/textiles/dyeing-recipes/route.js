import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DyeingRecipe from "@/models/textiles/DyeingRecipe";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Unauthorized", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Unauthorized", status: 401 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const productId = searchParams.get("productId");

    if (id) {
      const recipe = await DyeingRecipe.findOne({ _id: id, companyId: user.companyId })
        .populate("product", "itemName itemCode")
        .populate("ingredients.material", "itemName itemCode uom")
        .lean();
      if (!recipe) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: recipe });
    }

    const query = { companyId: user.companyId };
    if (productId) query.product = productId;

    const recipes = await DyeingRecipe.find(query)
      .populate("product", "itemName itemCode")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: recipes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const required = ["recipeCode", "product", "shadeName"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const existing = await DyeingRecipe.findOne({
      recipeCode: body.recipeCode,
      companyId: user.companyId,
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "Recipe code already exists" }, { status: 409 });
    }

    const recipe = new DyeingRecipe({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });
    await recipe.save();

    return NextResponse.json({ success: true, data: recipe }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
