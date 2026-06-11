import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    school_id: {
      type: Number,
      required: true,
    },
    // all / student / teacher
    target_role: {
      type: String,
      enum: ["all", "student", "teacher"],
      default: "all",
    },
    // null = sabko, number = specific class
    target_class_id: {
      type: Number,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // null = kabhi expire nahi
    expires_at: {
      type: Date,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ school_id: 1, is_active: 1, createdAt: -1 });

export const Announcement = mongoose.model("Announcement", AnnouncementSchema);