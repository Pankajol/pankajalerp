import mongoose from "mongoose";

const BorrowingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Library", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    borrowedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true }, // e.g., 7 days from borrowedDate
    returnedDate: { type: Date },
    status: {
      type: String,
      enum: ["borrowed", "returned", "overdue"],
      default: "borrowed",
    },
    // Add to BorrowingSchema
fine: {
  type: Number,
  default: 0,
  min: 0,
},
    notes: String,
  },
  { timestamps: true }
);

// Calculate overdue status based on dueDate
BorrowingSchema.methods.updateStatus = function () {
  if (this.returnedDate) return "returned";
  if (new Date() > this.dueDate) return "overdue";
  return "borrowed";
};

export default mongoose.models.Borrowing || mongoose.model("Borrowing", BorrowingSchema);