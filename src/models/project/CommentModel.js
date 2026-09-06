import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
  {
    url: String,
    public_id: String,
    originalName: String,
    mimeType: String,
    size: Number,
  },
  { _id: false }
);

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser",  },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
     attachments: [AttachmentSchema],
}, { timestamps: true });


export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
