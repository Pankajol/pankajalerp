import mongoose from "mongoose";

const DyeingRecipeSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    recipeCode: { type: String, required: true, unique: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    shadeName: { type: String, required: true },
    colorCode: { type: String },
    color: { type: String },
    shade: { type: String },
    machineType: { type: String },
    liquorRatio: { type: Number, min: 0 },
    temperature: { type: Number },
    totalTimeMinutes: { type: Number, min: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    ingredients: [
      {
        material: { type: mongoose.Schema.Types.ObjectId, ref: "Item" }, // dyes, chemicals
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        costPerUnit: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },
        materialType: { type: String, enum: ["dye", "chemical", "other"], default: "chemical" },
        dosage: { type: Number, min: 0 },
        dosageUom: { type: String },
        stage: { type: String },
        additionTime: { type: String },
        temperature: { type: Number },
      },
    ],
    totalCost: { type: Number, default: 0 },
    processSteps: [
      {
        step: { type: String },
        description: { type: String },
        temperature: { type: String },
        duration: { type: String },
      },
    ],
    status: { type: String, enum: ["draft", "approved", "obsolete"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

// Pre-save: calculate total cost
DyeingRecipeSchema.pre("save", function (next) {
  this.totalCost = this.ingredients.reduce((sum, item) => {
    item.quantity = item.quantity || item.dosage || 0;
    item.unit = item.unit || item.dosageUom || "";
    item.dosage = item.dosage ?? item.quantity;
    item.dosageUom = item.dosageUom || item.unit;
    item.totalCost = (item.quantity || 0) * (item.costPerUnit || 0);
    return sum + item.totalCost;
  }, 0);
  if (this.status === "approved" && !this.approvedAt) this.approvedAt = new Date();
  next();
});

export default mongoose.models.DyeingRecipe || mongoose.model("DyeingRecipe", DyeingRecipeSchema);
