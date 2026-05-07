import { pool } from "../config/mysql.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";

// Saare students fetch karo
const getAllStudents = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const { class_id } = req.query;

    let query = `SELECT s.*, c.class_name 
                 FROM students s
                 LEFT JOIN classes c ON s.class_id = c.id
                 WHERE s.school_id = ?`;
    const params = [school_id];

    if (class_id) {
      query += " AND s.class_id = ?";
      params.push(class_id);
    }

    query += " ORDER BY s.name ASC";

    const [rows] = await pool.query(query, params);
    res.status(200).json(new ApiResponse(200, "Students fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Student update karo
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;
    const { name, class_id, registration_number } = req.body;

    // verify student usi school ka hai
    const [student] = await pool.query(
      "SELECT id FROM students WHERE id = ? AND school_id = ?",
      [id, school_id]
    );
    if (!student.length) {
      return res.status(404).json(new ApiResponse(404, "Student not found"));
    }

    await pool.query(
      `UPDATE students SET 
        name = COALESCE(?, name),
        class_id = COALESCE(?, class_id),
        registration_number = COALESCE(?, registration_number)
       WHERE id = ? AND school_id = ?`,
      [name, class_id, registration_number, id, school_id]
    );

    res.status(200).json(new ApiResponse(200, "Student updated successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Student delete karo
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;

    const [student] = await pool.query(
      "SELECT id FROM students WHERE id = ? AND school_id = ?",
      [id, school_id]
    );
    if (!student.length) {
      return res.status(404).json(new ApiResponse(404, "Student not found"));
    }

    // MongoDB se bhi user delete karo
    await User.findOneAndDelete({ ref_id: parseInt(id), role: "student", school_id });

    // MySQL se delete karo
    await pool.query("DELETE FROM students WHERE id = ? AND school_id = ?", [id, school_id]);

    res.status(200).json(new ApiResponse(200, "Student deleted successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Student ka password reset karo
const resetStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    const school_id = req.user.school_id;

    if (!new_password) {
      return res.status(400).json(new ApiResponse(400, "new_password required"));
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const user = await User.findOneAndUpdate(
      { ref_id: parseInt(id), role: "student", school_id },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) return res.status(404).json(new ApiResponse(404, "Student not found"));

    res.status(200).json(new ApiResponse(200, "Password reset successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};



// Saare teachers fetch karo
const getAllTeachers = async (req, res) => {
  try {
    const school_id = req.user.school_id;

    const [rows] = await pool.query(
      `SELECT t.*, s.subject_name
       FROM teachers t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.school_id = ?
       ORDER BY t.name ASC`,
      [school_id]
    );

    res.status(200).json(new ApiResponse(200, "Teachers fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Teacher update karo
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;
    const { name, subject_id } = req.body;

    const [teacher] = await pool.query(
      "SELECT id FROM teachers WHERE id = ? AND school_id = ?",
      [id, school_id]
    );
    if (!teacher.length) {
      return res.status(404).json(new ApiResponse(404, "Teacher not found"));
    }

    await pool.query(
      `UPDATE teachers SET
        name = COALESCE(?, name),
        subject_id = COALESCE(?, subject_id)
       WHERE id = ? AND school_id = ?`,
      [name, subject_id, id, school_id]
    );

    res.status(200).json(new ApiResponse(200, "Teacher updated successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Teacher delete karo
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;

    const [teacher] = await pool.query(
      "SELECT id FROM teachers WHERE id = ? AND school_id = ?",
      [id, school_id]
    );
    if (!teacher.length) {
      return res.status(404).json(new ApiResponse(404, "Teacher not found"));
    }

    await User.findOneAndDelete({ ref_id: parseInt(id), role: "teacher", school_id });
    await pool.query("DELETE FROM teachers WHERE id = ? AND school_id = ?", [id, school_id]);

    res.status(200).json(new ApiResponse(200, "Teacher deleted successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Teacher ka password reset karo
const resetTeacherPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    const school_id = req.user.school_id;

    if (!new_password) {
      return res.status(400).json(new ApiResponse(400, "new_password required"));
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const user = await User.findOneAndUpdate(
      { ref_id: parseInt(id), role: "teacher", school_id },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) return res.status(404).json(new ApiResponse(404, "Teacher not found"));

    res.status(200).json(new ApiResponse(200, "Password reset successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};


const getAllClasses = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON c.id = s.class_id AND s.school_id = ?
       WHERE c.school_id = ?
       GROUP BY c.id
       ORDER BY c.class_name ASC`,
      [school_id, school_id]
    );
    res.status(200).json(new ApiResponse(200, "Classes fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

const createClass = async (req, res) => {
  try {
    const { class_name } = req.body;
    const school_id = req.user.school_id;

    if (!class_name) {
      return res.status(400).json(new ApiResponse(400, "class_name required"));
    }

    const [result] = await pool.query(
      "INSERT INTO classes (class_name, school_id) VALUES (?, ?)",
      [class_name, school_id]
    );

    res.status(201).json(new ApiResponse(201, "Class created", { id: result.insertId, class_name }));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;

    // check karo koi student hai is class mein
    const [students] = await pool.query(
      "SELECT id FROM students WHERE class_id = ? AND school_id = ?",
      [id, school_id]
    );
    if (students.length) {
      return res.status(400).json(new ApiResponse(400, "Cannot delete class with students"));
    }

    await pool.query("DELETE FROM classes WHERE id = ? AND school_id = ?", [id, school_id]);
    res.status(200).json(new ApiResponse(200, "Class deleted successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

const getAllSubjects = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const [rows] = await pool.query(
      "SELECT * FROM subjects WHERE school_id = ? ORDER BY subject_name ASC",
      [school_id]
    );
    res.status(200).json(new ApiResponse(200, "Subjects fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

const createSubject = async (req, res) => {
  try {
    const { subject_name } = req.body;
    const school_id = req.user.school_id;

    if (!subject_name) {
      return res.status(400).json(new ApiResponse(400, "subject_name required"));
    }

    const [result] = await pool.query(
      "INSERT INTO subjects (subject_name, school_id) VALUES (?, ?)",
      [subject_name, school_id]
    );

    res.status(201).json(new ApiResponse(201, "Subject created", { id: result.insertId, subject_name }));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;

    await pool.query("DELETE FROM subjects WHERE id = ? AND school_id = ?", [id, school_id]);
    res.status(200).json(new ApiResponse(200, "Subject deleted successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const school_id = req.user.school_id;

    const [[students]] = await pool.query(
      "SELECT COUNT(*) as total FROM students WHERE school_id = ?", [school_id]
    );
    const [[teachers]] = await pool.query(
      "SELECT COUNT(*) as total FROM teachers WHERE school_id = ?", [school_id]
    );
    const [[classes]] = await pool.query(
      "SELECT COUNT(*) as total FROM classes WHERE school_id = ?", [school_id]
    );
    const [[todayAttendance]] = await pool.query(
      "SELECT COUNT(*) as total FROM attendance WHERE school_id = ? AND date = CURDATE() AND status = 'present'",
      [school_id]
    );
    const [[pendingFees]] = await pool.query(
      "SELECT COUNT(*) as total, SUM(amount) as amount FROM fee_invoices WHERE school_id = ? AND status IN ('pending','partial','overdue')",
      [school_id]
    );

    res.status(200).json(new ApiResponse(200, "Dashboard stats fetched", {
      total_students: students.total,
      total_teachers: teachers.total,
      total_classes: classes.total,
      today_present: todayAttendance.total,
      pending_fee_count: pendingFees.total,
      pending_fee_amount: pendingFees.amount || 0
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

export default {
  getAllStudents, updateStudent, deleteStudent, resetStudentPassword,
  getAllTeachers, updateTeacher, deleteTeacher, resetTeacherPassword,
  getAllClasses, createClass, deleteClass,
  getAllSubjects, createSubject, deleteSubject,
  getDashboardStats
};