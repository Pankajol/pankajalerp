import mongoose from "mongoose";

const LibrarySchema = new mongoose.Schema(
  {
    bookId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true },
    category: { type: String, trim: true },
    publisher: { type: String, trim: true },
    edition: { type: String, trim: true },
    year: { type: Number },
    quantity: { type: Number, default: 1, min: 0 },
    availableQuantity: { type: Number, default: 1, min: 0 },
    shelfLocation: { type: String, trim: true },
    coverImage: { type: String, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

LibrarySchema.index({ companyId: 1, bookId: 1 }, { unique: true });
LibrarySchema.index({ companyId: 1, category: 1 });
LibrarySchema.index({ companyId: 1, author: 1 });

export default mongoose.models.Library || mongoose.model("Library", LibrarySchema);