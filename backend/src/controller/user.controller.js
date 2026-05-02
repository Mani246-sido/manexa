import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { registerUser } from "../auth/auth.service.js";
import bcrypt from "bcrypt";
import { sendLoginEmail, sendPasswordChangeEmail } from "../utils/emailvariable.js";
import { pool } from "../config/mysql.js";
import axios from "axios";
import { Face } from "../models/face.model.js";

// ─── Generate Tokens ──────────────────────────────────────────────────────────
export const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message || "Token generation failed");
  }
};

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role, class_id, subject, school_id, registration_number } = req.body;
    const newUser = await registerUser({ name, email, password, role, class_id, subject, school_id, registration_number });
    res.status(201).json(new ApiResponse(201, "User registered successfully", newUser));
  } catch (error) {
    res.status(400).json(new ApiResponse(400, error.message));
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, registration_number, password, school_id } = req.body;

    if (!password || (!email && !registration_number) || !school_id) {
      return res.status(400).json(new ApiResponse(400, "All credentials required including school"));
    }

    let user;
    if (registration_number) {
      user = await User.findOne({ registration_number, school_id });
    } else {
      user = await User.findOne({ email, school_id });
    }

    if (!user) return res.status(404).json(new ApiResponse(404, "User not found in this school"));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json(new ApiResponse(401, "Invalid credentials"));

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    try {
      await sendLoginEmail(user, req);
    } catch (err) {
      console.error("Mail send failed:", err.message);
    }

    res.status(200).json(new ApiResponse(200, "Login successful", {
      accessToken,
      refreshToken,
      role: user.role,
      school_id: user.school_id
    }));

  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken");
    if (!user) return res.status(404).json(new ApiResponse(404, "User not found"));
    res.status(200).json(new ApiResponse(200, "Profile fetched", user));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json(new ApiResponse(400, "Both fields required"));
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json(new ApiResponse(404, "User not found"));

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json(new ApiResponse(401, "Current password is incorrect"));

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordChangeEmail(user, req);
    } catch (err) {
      console.error("Password change mail failed:", err.message);
    }

    res.status(200).json(new ApiResponse(200, "Password changed successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json(new ApiResponse(404, "User not found"));

    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(new ApiResponse(200, "Logout successful"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Mark Attendance (Teacher) ────────────────────────────────────────────────
const markAttendance = async (req, res) => {
  try {
    const { student_id } = req.body;
    const school_id = req.user.school_id;

    // verify student usi school ka hai
    const [student] = await pool.query(
      "SELECT id FROM students WHERE id = ? AND school_id = ?",
      [student_id, school_id]
    );
    if (!student.length) {
      return res.status(404).json(new ApiResponse(404, "Student not found in your school"));
    }

    await pool.query(
      `INSERT INTO attendance (student_id, date, status, school_id)
       VALUES (?, CURDATE(), 'present', ?)
       ON DUPLICATE KEY UPDATE status='present'`,
      [student_id, school_id]
    );

    res.status(200).json(new ApiResponse(200, "Attendance marked successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Mark Attendance via AI ───────────────────────────────────────────────────
export const markAttendanceFromAI = async (req, res) => {
  try {
    const { image } = req.body;
    const school_id = req.user.school_id;

    if (!image) return res.status(400).json(new ApiResponse(400, "Image is required"));

    const [students] = await pool.query(
      "SELECT id FROM students WHERE school_id = ?",
      [school_id]
    );
    if (!students.length) {
      return res.status(404).json(new ApiResponse(404, "No students found"));
    }

    const studentIds = students.map(s => s.id);

    const faces = await Face.find({ student_id: { $in: studentIds } });
    if (!faces.length) {
      return res.status(404).json(new ApiResponse(404, "No faces registered yet"));
    }

    const known_encodings = faces.map(f => ({
      student_id: f.student_id,
      encoding: f.encoding
    }));

    const response = await axios.post(
      "http://localhost:5001/recognize-face",
      { image, known_encodings },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );

    const { matched, student_id } = response.data;
    if (!matched || !student_id) {
      return res.status(400).json(new ApiResponse(400, "Face not recognized"));
    }

    await pool.query(
      `INSERT INTO attendance (student_id, date, status, school_id)
       VALUES (?, CURDATE(), 'present', ?)
       ON DUPLICATE KEY UPDATE status='present'`,
      [student_id, school_id]
    );

    return res.status(200).json(new ApiResponse(200, "Attendance marked via AI", { student_id }));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, "AI attendance failed", { error: error.message }));
  }
};

// ─── Get Attendance (Student) ─────────────────────────────────────────────────
const getAttendance = async (req, res) => {
  try {
    const student_id = req.user.ref_id;
    const school_id = req.user.school_id;

    const [rows] = await pool.query(
      "SELECT * FROM attendance WHERE student_id = ? AND school_id = ? ORDER BY date DESC",
      [student_id, school_id]
    );
    res.status(200).json(new ApiResponse(200, "Attendance fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Upload Marks (Teacher) ───────────────────────────────────────────────────
const uploadMarks = async (req, res) => {
  try {
    const { student_id, subject_id, marks, grade } = req.body;
    const school_id = req.user.school_id;

    if (!student_id || !subject_id || !marks || !grade) {
      return res.status(400).json(new ApiResponse(400, "All fields required"));
    }

    // verify student usi school ka hai
    const [student] = await pool.query(
      "SELECT id FROM students WHERE id = ? AND school_id = ?",
      [student_id, school_id]
    );
    if (!student.length) {
      return res.status(404).json(new ApiResponse(404, "Student not found in your school"));
    }

    await pool.query(
      `INSERT INTO marks (student_id, subject_id, marks, grade, school_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE marks = ?, grade = ?`,
      [student_id, subject_id, marks, grade, school_id, marks, grade]
    );

    res.status(200).json(new ApiResponse(200, "Marks uploaded successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Get Marks (Student) ──────────────────────────────────────────────────────
const getMarks = async (req, res) => {
  try {
    const student_id = req.user.ref_id;
    const school_id = req.user.school_id;

    const [rows] = await pool.query(
      `SELECT m.marks, m.grade, s.subject_name
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = ? AND m.school_id = ?`,
      [student_id, school_id]
    );
    res.status(200).json(new ApiResponse(200, "Marks fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Get Result (Student) ─────────────────────────────────────────────────────
const getResult = async (req, res) => {
  try {
    const student_id = req.user.ref_id;
    const school_id = req.user.school_id;

    const [rows] = await pool.query(
      `SELECT m.marks, m.grade, s.subject_name
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = ? AND m.school_id = ?`,
      [student_id, school_id]
    );

    if (!rows.length) return res.status(404).json(new ApiResponse(404, "No result found"));

    const totalMarks = rows.reduce((sum, r) => sum + r.marks, 0);
    const maxMarks = rows.length * 100;
    const percentage = ((totalMarks / maxMarks) * 100).toFixed(2);

    let overallGrade = "F";
    if (percentage >= 90) overallGrade = "A+";
    else if (percentage >= 80) overallGrade = "A";
    else if (percentage >= 70) overallGrade = "B";
    else if (percentage >= 60) overallGrade = "C";
    else if (percentage >= 50) overallGrade = "D";

    res.status(200).json(new ApiResponse(200, "Result fetched", {
      subjects: rows,
      totalMarks,
      maxMarks,
      percentage: `${percentage}%`,
      overallGrade
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

export default {
  register,
  login,
  getProfile,
  changePassword,
  logout,
  markAttendance,
  markAttendanceFromAI,
  getAttendance,
  uploadMarks,
  getMarks,
  getResult
};