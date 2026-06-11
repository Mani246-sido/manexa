import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema(
  {
    student_id:       { type: Number, required: true },
    student_mongo_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    school_id:        { type: Number, required: true },
    leave_type: {
      type: String,
      enum: ["sick", "personal", "family", "other"],
      required: true,
    },
    from_date:     { type: Date, required: true },
    to_date:       { type: Date, required: true },
    total_days:    { type: Number, required: true },
    reason:        { type: String, required: true, trim: true },
    attachment_url:{ type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewed_by:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewed_at:      { type: Date, default: null },
    rejection_reason: { type: String, default: null },
  },
  { timestamps: true }
);

LeaveSchema.index({ school_id: 1, status: 1 });
LeaveSchema.index({ student_id: 1, createdAt: -1 });

export const Leave = mongoose.model("Leave", LeaveSchema);