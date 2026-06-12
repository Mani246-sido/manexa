import { Exam, ExamSubject } from "../models/exam.model.js";
import { Notification }      from "../models/notification.model.js";
import { User }              from "../models/user.model.js";
import { pool }              from "../config/mysql.js";
import ApiResponse           from "../utils/ApiResponse.js";
import { ApiError }          from "../utils/ApiError.js";

export const createExam = async (req, res, next) => {
  try {
    const {
      title, exam_type, academic_year,
      target_classes, start_date, end_date, instructions,
    } = req.body;

    if (!title || !exam_type || !academic_year || !target_classes?.length || !start_date || !end_date) {
      throw new ApiError(400, "title, exam_type, academic_year, target_classes, start_date, end_date required");
    }

    if (new Date(start_date) > new Date(end_date)) {
      throw new ApiError(400, "start_date cannot be after end_date");
    }

    const exam = await Exam.create({
      school_id:     req.user.school_id,
      title,
      exam_type,
      academic_year,
      target_classes,
      start_date:    new Date(start_date),
      end_date:      new Date(end_date),
      instructions:  instructions || null,
      created_by:    req.user.id,
    });

    await notifyExamCreated(exam, req.user.school_id);

    return res.status(201).json(new ApiResponse(201, "Exam created successfully", exam));
  } catch (error) {
    next(error);
  }
};

export const getAllExams = async (req, res, next) => {
  try {
    const { academic_year, exam_type } = req.query;
    const school_id = req.user.school_id;

    const filter = { school_id, is_active: true };
    if (academic_year) filter.academic_year = academic_year;
    if (exam_type)     filter.exam_type     = exam_type;

    // Student ko sirf apni class ke exams
    if (req.user.role === "student") {
      const [rows] = await pool.query(
        "SELECT class_id FROM students WHERE id = ? AND school_id = ?",
        [req.user.ref_id, school_id]
      );
      if (rows.length) {
        filter.target_classes = { $in: [rows[0].class_id] };
      }
    }

    const exams = await Exam.find(filter)
      .populate("created_by", "name role")
      .sort({ start_date: 1 });

    return res.status(200).json(new ApiResponse(200, "Exams fetched", exams));
  } catch (error) {
    next(error);
  }
};


export const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id, school_id: req.user.school_id, is_active: true,
    }).populate("created_by", "name role");

    if (!exam) throw new ApiError(404, "Exam not found");

    const subjects = await ExamSubject.find({ exam_id: exam._id }).sort({ exam_date: 1 });

    const subjectIds     = [...new Set(subjects.map((s) => s.subject_id))];
    const invigilatorIds = [...new Set(subjects.map((s) => s.invigilator_id).filter(Boolean))];

    let subjectMap = {}, invigilatorMap = {};

    if (subjectIds.length) {
      const [rows] = await pool.query(
        `SELECT id, subject_name FROM subjects WHERE id IN (${subjectIds.map(() => "?").join(",")})`,
        subjectIds
      );
      rows.forEach((r) => (subjectMap[r.id] = r.subject_name));
    }
    if (invigilatorIds.length) {
      const [rows] = await pool.query(
        `SELECT id, name FROM teachers WHERE id IN (${invigilatorIds.map(() => "?").join(",")})`,
        invigilatorIds
      );
      rows.forEach((r) => (invigilatorMap[r.id] = r.name));
    }

    const enrichedSubjects = subjects.map((s) => ({
      ...s.toObject(),
      subject_name:     subjectMap[s.subject_id]         || null,
      invigilator_name: invigilatorMap[s.invigilator_id] || null,
    }));

    return res.status(200).json(
      new ApiResponse(200, "Exam fetched", { exam, subjects: enrichedSubjects })
    );
  } catch (error) {
    next(error);
  }
};

export const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school_id: req.user.school_id });
    if (!exam) throw new ApiError(404, "Exam not found");

    const fields = ["title","exam_type","academic_year","target_classes","start_date","end_date","instructions"];
    fields.forEach((f) => { if (req.body[f] !== undefined) exam[f] = req.body[f]; });

    await exam.save();
    return res.status(200).json(new ApiResponse(200, "Exam updated", exam));
  } catch (error) {
    next(error);
  }
};

export const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school_id: req.user.school_id });
    if (!exam) throw new ApiError(404, "Exam not found");

    exam.is_active = false;
    await exam.save();

    return res.status(200).json(new ApiResponse(200, "Exam deleted successfully"));
  } catch (error) {
    next(error);
  }
};

export const addExamSubject = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school_id: req.user.school_id });
    if (!exam) throw new ApiError(404, "Exam not found");

    const {
      subject_id, class_id, exam_date, start_time,
      end_time, duration_minutes, total_marks, pass_marks,
      room, invigilator_id,
    } = req.body;

    if (!subject_id || !class_id || !exam_date || !start_time || !end_time || !total_marks || !pass_marks) {
      throw new ApiError(400, "subject_id, class_id, exam_date, start_time, end_time, total_marks, pass_marks required");
    }

    const exists = await ExamSubject.findOne({
      exam_id: exam._id, subject_id: parseInt(subject_id), class_id: parseInt(class_id),
    });
    if (exists) throw new ApiError(400, "Subject already added for this class in this exam");

    const examSubject = await ExamSubject.create({
      exam_id:          exam._id,
      school_id:        req.user.school_id,
      subject_id:       parseInt(subject_id),
      class_id:         parseInt(class_id),
      exam_date:        new Date(exam_date),
      start_time,
      end_time,
      duration_minutes: parseInt(duration_minutes),
      total_marks:      parseInt(total_marks),
      pass_marks:       parseInt(pass_marks),
      room:             room || null,
      invigilator_id:   invigilator_id ? parseInt(invigilator_id) : null,
    });

    return res.status(201).json(new ApiResponse(201, "Subject added to exam", examSubject));
  } catch (error) {
    next(error);
  }
};


export const updateExamSubject = async (req, res, next) => {
  try {
    const subject = await ExamSubject.findOne({
      _id: req.params.subjectId, school_id: req.user.school_id,
    });
    if (!subject) throw new ApiError(404, "Exam subject not found");

    const fields = ["exam_date","start_time","end_time","duration_minutes",
                    "total_marks","pass_marks","room","invigilator_id"];
    fields.forEach((f) => { if (req.body[f] !== undefined) subject[f] = req.body[f]; });

    await subject.save();
    return res.status(200).json(new ApiResponse(200, "Exam subject updated", subject));
  } catch (error) {
    next(error);
  }
};


export const deleteExamSubject = async (req, res, next) => {
  try {
    const subject = await ExamSubject.findOneAndDelete({
      _id: req.params.subjectId, school_id: req.user.school_id,
    });
    if (!subject) throw new ApiError(404, "Exam subject not found");

    return res.status(200).json(new ApiResponse(200, "Exam subject removed"));
  } catch (error) {
    next(error);
  }
};


export const getMyExamSchedule = async (req, res, next) => {
  try {
    const school_id = req.user.school_id;

    const [rows] = await pool.query(
      "SELECT class_id FROM students WHERE id = ? AND school_id = ?",
      [req.user.ref_id, school_id]
    );
    if (!rows.length) throw new ApiError(404, "Student not found");

    const class_id = rows[0].class_id;

    const exams = await Exam.find({
      school_id, is_active: true, target_classes: { $in: [class_id] },
    }).sort({ start_date: 1 });

    if (!exams.length) {
      return res.status(200).json(new ApiResponse(200, "No exams scheduled", []));
    }

    const examIds  = exams.map((e) => e._id);
    const subjects = await ExamSubject.find({
      exam_id: { $in: examIds }, class_id: parseInt(class_id),
    }).sort({ exam_date: 1 });

    const subjectIds = [...new Set(subjects.map((s) => s.subject_id))];
    let subjectMap   = {};
    if (subjectIds.length) {
      const [sRows] = await pool.query(
        `SELECT id, subject_name FROM subjects WHERE id IN (${subjectIds.map(() => "?").join(",")})`,
        subjectIds
      );
      sRows.forEach((r) => (subjectMap[r.id] = r.subject_name));
    }

    const examMap = {};
    exams.forEach((e) => { examMap[e._id.toString()] = { ...e.toObject(), subjects: [] }; });
    subjects.forEach((s) => {
      const key = s.exam_id.toString();
      if (examMap[key]) {
        examMap[key].subjects.push({ ...s.toObject(), subject_name: subjectMap[s.subject_id] || null });
      }
    });

    return res.status(200).json(
      new ApiResponse(200, "Exam schedule fetched", Object.values(examMap))
    );
  } catch (error) {
    next(error);
  }
};


const notifyExamCreated = async (exam, school_id) => {
  try {
    const placeholders = exam.target_classes.map(() => "?").join(",");
    const [students]   = await pool.query(
      `SELECT id FROM students WHERE class_id IN (${placeholders}) AND school_id = ?`,
      [...exam.target_classes, school_id]
    );
    if (!students.length) return;

    const studentIds   = students.map((s) => s.id);
    const studentUsers = await User.find({
      ref_id: { $in: studentIds }, role: "student", school_id,
    }).select("_id");

    if (!studentUsers.length) return;

    const notifications = studentUsers.map((u) => ({
      user_id: u._id,
      title:   `📝 Exam Scheduled: ${exam.title}`,
      message: `${exam.exam_type.replace("_", " ").toUpperCase()} from ${exam.start_date.toDateString()} to ${exam.end_date.toDateString()}.`,
      type:    "info",
    }));

    await Notification.insertMany(notifications);
  } catch (err) {
    console.error("Exam notification failed:", err.message);
  }
};