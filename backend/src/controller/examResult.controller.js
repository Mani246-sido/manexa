import { Exam, ExamSubject } from "../models/exam.model.js";
import { ExamResult }        from "../models/examResult.model.js";
import { Notification }      from "../models/notification.model.js";
import { User }              from "../models/user.model.js";
import { pool }              from "../config/mysql.js";
import ApiResponse           from "../utils/ApiResponse.js";
import { ApiError }          from "../utils/ApiError.js";

const calcGrade = (pct) => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
};


export const enterResult = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { exam_subject_id, student_id, marks_obtained, remarks } = req.body;

    if (!exam_subject_id || !student_id || marks_obtained === undefined) {
      throw new ApiError(400, "exam_subject_id, student_id, marks_obtained required");
    }

    const exam = await Exam.findOne({ _id: examId, school_id: req.user.school_id, is_active: true });
    if (!exam) throw new ApiError(404, "Exam not found");

    const examSubject = await ExamSubject.findOne({
      _id: exam_subject_id, exam_id: examId, school_id: req.user.school_id,
    });
    if (!examSubject) throw new ApiError(404, "Exam subject not found");

    if (marks_obtained < 0 || marks_obtained > examSubject.total_marks) {
      throw new ApiError(400, `marks_obtained must be between 0 and ${examSubject.total_marks}`);
    }

    const percentage = parseFloat(((marks_obtained / examSubject.total_marks) * 100).toFixed(2));
    const grade      = calcGrade(percentage);
    const is_pass    = marks_obtained >= examSubject.pass_marks;

    const result = await ExamResult.findOneAndUpdate(
      { exam_id: examId, exam_subject_id, student_id: parseInt(student_id) },
      {
        exam_id, exam_subject_id,
        school_id:      req.user.school_id,
        student_id:     parseInt(student_id),
        subject_id:     examSubject.subject_id,
        class_id:       examSubject.class_id,
        marks_obtained: parseFloat(marks_obtained),
        total_marks:    examSubject.total_marks,
        pass_marks:     examSubject.pass_marks,
        percentage, grade, is_pass,
        remarks:        remarks || null,
        entered_by:     req.user.id,
      },
      { upsert: true, new: true }
    );

    // Student notify
    const student = await User.findOne({
      ref_id: parseInt(student_id), role: "student", school_id: req.user.school_id,
    }).select("_id");

    if (student) {
      const [subRow] = await pool.query(
        "SELECT subject_name FROM subjects WHERE id = ?", [examSubject.subject_id]
      );
      await Notification.create({
        user_id: student._id,
        title:   `📝 Result Published: ${exam.title}`,
        message: `${subRow[0]?.subject_name || "Subject"} — ${marks_obtained}/${examSubject.total_marks} (${percentage}%) — Grade: ${grade}`,
        type:    is_pass ? "success" : "warning",
      });
    }

    return res.status(200).json(new ApiResponse(200, "Result entered successfully", result));
  } catch (error) {
    next(error);
  }
};

export const bulkEnterResults = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { exam_subject_id, records } = req.body;

    if (!exam_subject_id || !records?.length) {
      throw new ApiError(400, "exam_subject_id and records[] required");
    }

    const exam = await Exam.findOne({ _id: examId, school_id: req.user.school_id, is_active: true });
    if (!exam) throw new ApiError(404, "Exam not found");

    const examSubject = await ExamSubject.findOne({
      _id: exam_subject_id, exam_id: examId, school_id: req.user.school_id,
    });
    if (!examSubject) throw new ApiError(404, "Exam subject not found");

    const ops      = [];
    const notifData = [];

    for (const r of records) {
      if (r.marks_obtained === undefined || r.marks_obtained < 0 || r.marks_obtained > examSubject.total_marks) continue;

      const percentage = parseFloat(((r.marks_obtained / examSubject.total_marks) * 100).toFixed(2));
      const grade      = calcGrade(percentage);
      const is_pass    = r.marks_obtained >= examSubject.pass_marks;

      ops.push(
        ExamResult.findOneAndUpdate(
          { exam_id: examId, exam_subject_id, student_id: parseInt(r.student_id) },
          {
            exam_id, exam_subject_id,
            school_id:      req.user.school_id,
            student_id:     parseInt(r.student_id),
            subject_id:     examSubject.subject_id,
            class_id:       examSubject.class_id,
            marks_obtained: parseFloat(r.marks_obtained),
            total_marks:    examSubject.total_marks,
            pass_marks:     examSubject.pass_marks,
            percentage, grade, is_pass,
            remarks:        r.remarks || null,
            entered_by:     req.user.id,
          },
          { upsert: true, new: true }
        )
      );
      notifData.push({ student_id: r.student_id, percentage, grade, is_pass });
    }

    await Promise.all(ops);

    // Bulk notify
    const studentUsers = await User.find({
      ref_id: { $in: notifData.map((n) => n.student_id) },
      role: "student", school_id: req.user.school_id,
    }).select("_id ref_id");

    const [subRow]    = await pool.query("SELECT subject_name FROM subjects WHERE id = ?", [examSubject.subject_id]);
    const subjectName = subRow[0]?.subject_name || "Subject";

    const notifications = studentUsers.map((s) => {
      const nd = notifData.find((n) => n.student_id === s.ref_id);
      return {
        user_id: s._id,
        title:   `📝 Result Published: ${exam.title}`,
        message: `${subjectName} — ${nd.percentage}% — Grade: ${nd.grade}`,
        type:    nd.is_pass ? "success" : "warning",
      };
    });

    if (notifications.length) await Notification.insertMany(notifications);

    return res.status(200).json(new ApiResponse(200, `${ops.length} results entered`, { count: ops.length }));
  } catch (error) {
    next(error);
  }
};


export const getMyResult = async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findOne({ _id: examId, school_id: req.user.school_id, is_active: true });
    if (!exam) throw new ApiError(404, "Exam not found");

    const results = await ExamResult.find({
      exam_id: examId, student_id: req.user.ref_id, school_id: req.user.school_id,
    });

    const subjectIds = results.map((r) => r.subject_id);
    let subjectMap   = {};
    if (subjectIds.length) {
      const [rows] = await pool.query(
        `SELECT id, subject_name FROM subjects WHERE id IN (${subjectIds.map(() => "?").join(",")})`,
        subjectIds
      );
      rows.forEach((r) => (subjectMap[r.id] = r.subject_name));
    }

    const enriched      = results.map((r) => ({ ...r.toObject(), subject_name: subjectMap[r.subject_id] || null }));
    const totalObtained = results.reduce((a, r) => a + r.marks_obtained, 0);
    const totalMax      = results.reduce((a, r) => a + r.total_marks, 0);
    const overallPct    = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const failedSubjects = results.filter((r) => !r.is_pass).length;

    return res.status(200).json(
      new ApiResponse(200, "Result fetched", {
        exam,
        results: enriched,
        summary: {
          total_subjects:     results.length,
          total_obtained:     totalObtained,
          total_max:          totalMax,
          overall_percentage: overallPct,
          overall_grade:      calcGrade(overallPct),
          failed_subjects:    failedSubjects,
          is_overall_pass:    failedSubjects === 0,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getClassResults = async (req, res, next) => {
  try {
    const { examId, classId } = req.params;

    const results = await ExamResult.find({
      exam_id: examId, class_id: parseInt(classId), school_id: req.user.school_id,
    }).sort({ student_id: 1 });

    const studentIds = [...new Set(results.map((r) => r.student_id))];
    const subjectIds = [...new Set(results.map((r) => r.subject_id))];

    let studentMap = {}, subjectMap = {};

    if (studentIds.length) {
      const [rows] = await pool.query(
        `SELECT id, name, registration_number FROM students WHERE id IN (${studentIds.map(() => "?").join(",")})`,
        studentIds
      );
      rows.forEach((r) => (studentMap[r.id] = r));
    }
    if (subjectIds.length) {
      const [rows] = await pool.query(
        `SELECT id, subject_name FROM subjects WHERE id IN (${subjectIds.map(() => "?").join(",")})`,
        subjectIds
      );
      rows.forEach((r) => (subjectMap[r.id] = r.subject_name));
    }

    const studentResults = {};
    results.forEach((r) => {
      if (!studentResults[r.student_id]) {
        studentResults[r.student_id] = {
          student_id:     r.student_id,
          student_info:   studentMap[r.student_id] || null,
          subjects:       [],
          total_obtained: 0,
          total_max:      0,
        };
      }
      studentResults[r.student_id].subjects.push({ ...r.toObject(), subject_name: subjectMap[r.subject_id] || null });
      studentResults[r.student_id].total_obtained += r.marks_obtained;
      studentResults[r.student_id].total_max      += r.total_marks;
    });

    const ranked = Object.values(studentResults)
      .map((s) => ({
        ...s,
        overall_percentage: s.total_max > 0 ? parseFloat(((s.total_obtained / s.total_max) * 100).toFixed(2)) : 0,
        overall_grade:      calcGrade(s.total_max > 0 ? (s.total_obtained / s.total_max) * 100 : 0),
        is_pass:            s.subjects.every((sub) => sub.is_pass),
      }))
      .sort((a, b) => b.overall_percentage - a.overall_percentage)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return res.status(200).json(
      new ApiResponse(200, "Class results fetched", {
        total_students: ranked.length,
        topper:         ranked[0] || null,
        results:        ranked,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getExamStats = async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findOne({ _id: examId, school_id: req.user.school_id });
    if (!exam) throw new ApiError(404, "Exam not found");

    const results = await ExamResult.find({ exam_id: examId, school_id: req.user.school_id });

    if (!results.length) {
      return res.status(200).json(new ApiResponse(200, "No results entered yet", { total: 0 }));
    }

    const total   = results.length;
    const passed  = results.filter((r) => r.is_pass).length;
    const avgPct  = parseFloat((results.reduce((a, r) => a + r.percentage, 0) / total).toFixed(2));
    const highest = Math.max(...results.map((r) => r.percentage));
    const lowest  = Math.min(...results.map((r) => r.percentage));

    const gradeCount = {};
    results.forEach((r) => { gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1; });

    return res.status(200).json(
      new ApiResponse(200, "Exam stats fetched", {
        exam_title:          exam.title,
        total_results:       total,
        passed,
        failed:              total - passed,
        pass_percentage:     parseFloat(((passed / total) * 100).toFixed(2)),
        average_percentage:  avgPct,
        highest_percentage:  highest,
        lowest_percentage:   lowest,
        grade_distribution:  gradeCount,
      })
    );
  } catch (error) {
    next(error);
  }
};