import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    parentPasswordHash: {
      type: String,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },

    // Add this inside the schema, after the 'address' field or near 'house'

houseInfo: {
  name: { type: String, trim: true },
  line1: { type: String, trim: true },
  line2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  pin: { type: String, trim: true },
},
    // Academics
    class: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    rollNumber: {
      type: Number,
    },
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "House",
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isScholar: {
      type: Boolean,
      default: false,
    },
    // Siblings (self-reference)
    siblings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    // Multi‑class support
    multiClasses: [
      {
        class: String,
        section: String,
        academicYear: String,
      },
    ],
    // Documents
    documents: [
      {
        name: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Guardian/Parent
    parent: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      relation: {
        type: String,
        enum: ["father", "mother", "guardian"],
      },
    },
    // School reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
StudentSchema.index({ companyId: 1, studentId: 1 }, { unique: true });
StudentSchema.index({ companyId: 1, class: 1 });
StudentSchema.index({ companyId: 1, isActive: 1 });
StudentSchema.index({ companyId: 1, firstName: "text", lastName: "text", studentId: "text", email: "text" });

export default mongoose.models.Student || mongoose.model("Student", StudentSchema);
