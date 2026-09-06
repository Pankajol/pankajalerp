import mongoose from "mongoose";

const SalesOrderProductionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", required: true, unique: true },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    plant: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "delayed", "cancelled"],
      default: "pending",
    },
    plannedQuantity: { type: Number, required: true, min: 0 },
    producedQuantity: { type: Number, default: 0 },
    balanceQuantity: { type: Number, default: 0 },
    deliveryDate: { type: Date },
    priority: { type: Number, default: 1 }, // 1=Normal, 2=High, 3=Urgent
    priorityLabel: { type: String, enum: ["Low", "Normal", "High", "Urgent"], default: "Normal" },
    requiredDate: { type: Date },
    productionItems: [{ item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" }, fabricSpecification: String, color: String, shade: String, gsm: Number, width: Number, quantity: Number, uom: String, salesOrderItem: String }],
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Pre-save: calculate balance
SalesOrderProductionSchema.pre("save", function (next) {
  this.balanceQuantity = this.plannedQuantity - this.producedQuantity;
  next();
});

export default mongoose.models.SalesOrderProduction ||
  mongoose.model("SalesOrderProduction", SalesOrderProductionSchema);
