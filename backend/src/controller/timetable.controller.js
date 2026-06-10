import { pool } from "../config/mysql.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

export const createTimetable = async (req, res, next) => {
  try {
    const {
      class_id,
      section_id,
      subject_id,
      teacher_id,
      day,
      start_time,
      end_time,
    } = req.body;

    // Teacher Conflict
    const [teacherConflict] = await pool.query(
      `
      SELECT id
      FROM timetables
      WHERE teacher_id = ?
      AND day = ?
      AND start_time = ?
      `,
      [teacher_id, day, start_time]
    );

    if (teacherConflict.length) {
      throw new ApiError(400, "Teacher already assigned at this time");
    }

    // Class + Section Conflict
    const [classConflict] = await pool.query(
      `
      SELECT id
      FROM timetables
      WHERE class_id = ?
      AND section_id = ?
      AND day = ?
      AND start_time = ?
      `,
      [class_id, section_id, day, start_time]
    );

    if (classConflict.length) {
      throw new ApiError(400, "Class timetable already exists");
    }

    const [result] = await pool.query(
      `
      INSERT INTO timetables
      (
        school_id,
        class_id,
        section_id,
        subject_id,
        teacher_id,
        day,
        start_time,
        end_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.school_id,
        class_id,
        section_id,
        subject_id,
        teacher_id,
        day,
        start_time,
        end_time,
      ]
    );

    return res.status(201).json(
      new ApiResponse(201, "Timetable created", {
        timetable_id: result.insertId,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getStudentTimetable = async (req, res, next) => {
  try {
    const student_id = req.user.ref_id;

    const [student] = await pool.query(
      `
      SELECT class_id, section_id
      FROM students
      WHERE id = ?
      `,
      [student_id]
    );

    if (!student.length) {
      throw new ApiError(404, "Student not found");
    }

    const [timetable] = await pool.query(
      `
      SELECT
        t.id,
        t.day,
        t.start_time,
        t.end_time,
        sub.subject_name,
        te.name AS teacher_name
      FROM timetables t
      JOIN subjects sub
        ON sub.id = t.subject_id
      JOIN teachers te
        ON te.id = t.teacher_id
      WHERE t.class_id = ?
      AND t.section_id = ?
      ORDER BY t.day, t.start_time
      `,
      [student[0].class_id, student[0].section_id]
    );

    return res.status(200).json(
      new ApiResponse(200, "Student timetable", timetable)
    );
  } catch (error) {
    next(error);
  }
};

export const getTeacherTimetable = async (req, res, next) => {
  try {
    const teacher_id = req.user.ref_id;

    const [timetable] = await pool.query(
      `
      SELECT
        t.id,
        t.day,
        t.start_time,
        t.end_time,
        c.class_name,
        s.section_name,
        sub.subject_name
      FROM timetables t
      JOIN classes c
        ON c.id = t.class_id
      JOIN sections s
        ON s.id = t.section_id
      JOIN subjects sub
        ON sub.id = t.subject_id
      WHERE t.teacher_id = ?
      ORDER BY t.day, t.start_time
      `,
      [teacher_id]
    );

    return res.status(200).json(
      new ApiResponse(200, "Teacher timetable", timetable)
    );
  } catch (error) {
    next(error);
  }
};

export const deleteTimetable = async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM timetables
      WHERE id = ?
      `,
      [id]
    );

    return res.status(200).json(
      new ApiResponse(200, "Timetable deleted")
    );
  } catch (error) {
    next(error);
  }
};