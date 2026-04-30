import { Face } from "../models/face.model.js";
import { pool } from "../config/mysql.js";
import ApiResponse from "../utils/ApiResponse.js";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";

// ─── Register Face ────────────────────────────────────────────────────────────
// Teacher/Admin student ka face register karega
const registerFace = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(new ApiResponse(400, "Image is required"));
    }

    const { student_id } = req.body;
    if (!student_id) {
      return res.status(400).json(new ApiResponse(400, "student_id is required"));
    }

    // check karo student exist karta hai ya nahi
    const [student] = await pool.query(
      "SELECT id FROM students WHERE id = ? AND school_id = ?",
      [student_id, req.user.school_id]
    );
    if (!student.length) {
      return res.status(404).json(new ApiResponse(404, "Student not found"));
    }

    // python service ko image bhejo encoding ke liye
    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path));

    const response = await axios.post(
      "http://localhost:5001/encode-face",
      formData,
      { headers: formData.getHeaders(), timeout: 10000 }
    );

    const { encoding, success } = response.data;

    if (!success || !encoding) {
      return res.status(400).json(new ApiResponse(400, "No face detected in image"));
    }

    // pehle se face registered hai to update karo
    const existingFace = await Face.findOne({ student_id });

    if (existingFace) {
      existingFace.encoding = encoding;
      existingFace.image_url = req.file.path;
      await existingFace.save();
    } else {
      await Face.create({
        student_id,
        encoding,
        image_url: req.file.path
      });
    }

    // temp file delete karo
    fs.unlinkSync(req.file.path);

    return res.status(201).json(new ApiResponse(201, "Face registered successfully", {
      student_id
    }));

  } catch (error) {
    console.error("Face Register Error:", error.message);
    return res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Get Face Status ──────────────────────────────────────────────────────────
// Check karo kis student ka face registered hai kis ka nahi
const getFaceStatus = async (req, res) => {
  try {
    const school_id = req.user.school_id;

    // school ke saare students
    const [students] = await pool.query(
      "SELECT id, name FROM students WHERE school_id = ?",
      [school_id]
    );

    // jinke face registered hain
    const registeredFaces = await Face.find({
      student_id: { $in: students.map(s => s.id) }
    }).select("student_id");

    const registeredIds = new Set(registeredFaces.map(f => f.student_id));

    const result = students.map(s => ({
      student_id: s.id,
      name: s.name,
      face_registered: registeredIds.has(s.id)
    }));

    return res.status(200).json(new ApiResponse(200, "Face status fetched", result));

  } catch (error) {
    return res.status(500).json(new ApiResponse(500, error.message));
  }
};

// ─── Delete Face ──────────────────────────────────────────────────────────────
const deleteFace = async (req, res) => {
  try {
    const { student_id } = req.params;

    const face = await Face.findOneAndDelete({ student_id });

    if (!face) {
      return res.status(404).json(new ApiResponse(404, "Face not found"));
    }

    return res.status(200).json(new ApiResponse(200, "Face deleted successfully"));

  } catch (error) {
    return res.status(500).json(new ApiResponse(500, error.message));
  }
};

export default { registerFace, getFaceStatus, deleteFace };