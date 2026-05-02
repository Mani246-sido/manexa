import { pool } from "../config/mysql.js";
import ApiResponse from "../utils/ApiResponse.js";

// School register
const registerSchool = async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    if (!name || !email) {
      return res.status(400).json(new ApiResponse(400, "Name and email required"));
    }

    const [existing] = await pool.query(
      "SELECT id FROM schools WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json(new ApiResponse(400, "School already registered"));
    }

    const [result] = await pool.query(
      "INSERT INTO schools (name, address, phone, email) VALUES (?, ?, ?, ?)",
      [name, address, phone, email]
    );

    res.status(201).json(new ApiResponse(201, "School registered successfully", {
      school_id: result.insertId,
      name
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Saari schools — superadmin ke liye
const getAllSchools = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, created_at FROM schools"
    );
    res.status(200).json(new ApiResponse(200, "Schools fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Public list — login/register dropdown ke liye, sirf id aur name
const getSchoolsList = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM schools ORDER BY name ASC"
    );
    res.status(200).json(new ApiResponse(200, "Schools list fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

export default { registerSchool, getAllSchools, getSchoolsList };