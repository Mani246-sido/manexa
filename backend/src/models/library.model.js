import mongoose from "mongoose";


const BookSchema = new mongoose.Schema(
  {
    school_id:   { type: Number, required: true },

    title:       { type: String, required: true, trim: true },
    author:      { type: String, required: true, trim: true },
    isbn:        { type: String, trim: true, default: null },
    publisher:   { type: String, trim: true, default: null },
    edition:     { type: String, trim: true, default: null },
    category: {
      type: String,
      enum: ["textbook", "novel", "reference", "magazine", "science", "history", "other"],
      default: "other",
    },
    language:    { type: String, default: "English" },
    total_copies:     { type: Number, required: true, min: 1 },
    available_copies: { type: Number, required: true, min: 0 },

    shelf_location: { type: String, default: null }, // "A-12", "B-3"
    cover_image:    { type: String, default: null },
    description:    { type: String, default: null },

    added_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BookSchema.index({ school_id: 1, is_active: 1 });
BookSchema.index({ school_id: 1, category: 1 });
BookSchema.index({ isbn: 1 });

const BookIssueSchema = new mongoose.Schema(
  {
    school_id: { type: Number, required: true },
    book_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },

    // Issued to — student ya teacher
    issued_to_id:   { type: Number, required: true },   // MySQL ref_id
    issued_to_role: {
      type: String,
      enum: ["student", "teacher"],
      required: true,
    },
    issued_to_mongo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    issued_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    issue_date:   { type: Date, required: true, default: Date.now },
    due_date:     { type: Date, required: true },       // return karne ki deadline
    return_date:  { type: Date, default: null },        // actual return date

    status: {
      type: String,
      enum: ["issued", "returned", "overdue", "lost"],
      default: "issued",
    },

    // Fine
    fine_per_day:   { type: Number, default: 2 },      
    fine_amount:    { type: Number, default: 0 },
    fine_paid:      { type: Boolean, default: false },

    remarks: { type: String, default: null },
  },
  { timestamps: true }
);

BookIssueSchema.index({ school_id: 1, status: 1 });
BookIssueSchema.index({ book_id: 1, status: 1 });
BookIssueSchema.index({ issued_to_id: 1, issued_to_role: 1 });

export const Book      = mongoose.model("Book", BookSchema);
export const BookIssue = mongoose.model("BookIssue", BookIssueSchema);