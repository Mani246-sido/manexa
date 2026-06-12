import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema(
  {
    school_id: { type: Number, required: true },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    exam_type: {
      type: String,
      enum: ["unit_test", "midterm", "final", "practical", "mock"],
      required: true,
    },
    academic_year: {
      type: String,
      required: true,
    },
    target_classes: {
      type: [Number],
      required: true,
    },
    start_date: { type: Date, required: true },
    end_date:   { type: Date, required: true },
    instructions: { type: String, default: null },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExamSchema.index({ school_id: 1, is_active: 1 });
ExamSchema.index({ school_id: 1, academic_year: 1 });

const ExamSubjectSchema = new mongoose.Schema(
  {
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    school_id:  { type: Number, required: true },
    subject_id: { type: Number, required: true },
    class_id:   { type: Number, required: true },
    exam_date:  { type: Date,   required: true },
    start_time: { type: String, required: true },
    end_time:   { type: String, required: true },
    duration_minutes: { type: Number, required: true },
    total_marks: { type: Number, required: true },
    pass_marks:  { type: Number, required: true },
    room:            { type: String, default: null },
    invigilator_id:  { type: Number, default: null },
  },
  { timestamps: true }
);

ExamSubjectSchema.index({ exam_id: 1 });
ExamSubjectSchema.index({ school_id: 1, exam_date: 1 });

export const Exam        = mongoose.model("Exam", ExamSchema);
export const ExamSubject = mongoose.model("ExamSubject", ExamSubjectSchema);