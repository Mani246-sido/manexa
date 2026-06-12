import mongoose from "mongoose";

const ExamResultSchema = new mongoose.Schema(
  {
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    exam_subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSubject",
      required: true,
    },
    school_id:  { type: Number, required: true },
    student_id: { type: Number, required: true },
    subject_id: { type: Number, required: true },
    class_id:   { type: Number, required: true },

    marks_obtained: { type: Number, required: true },
    total_marks:    { type: Number, required: true },
    pass_marks:     { type: Number, required: true },

    percentage: { type: Number },
    grade:      { type: String },
    is_pass:    { type: Boolean },

    remarks:    { type: String, default: null },
    entered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

ExamResultSchema.index(
  { exam_id: 1, exam_subject_id: 1, student_id: 1 },
  { unique: true }
);
ExamResultSchema.index({ school_id: 1, student_id: 1 });

export const ExamResult = mongoose.model("ExamResult", ExamResultSchema);