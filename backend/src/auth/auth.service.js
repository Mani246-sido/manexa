import bcrypt from 'bcrypt';
import { User } from '../models/user.model.js';
import { pool } from '../config/mysql.js';

export const registerUser = async (data) => {
  const { name, email, password, role, class_id, subject, school_id, registration_number } = data;

  if (!school_id) throw new Error("school_id is required");

  if (role === "student" && !registration_number) {
    throw new Error("Registration number is required for students");
  }
  if (role === "teacher" && !email) {
    throw new Error("Email is required for teachers");
  }

  // duplicate check
  if (role === "student") {
    const existingReg = await User.findOne({ registration_number, school_id });
    if (existingReg) throw new Error("Registration number already exists in this school");
  } else {
    const existingEmail = await User.findOne({ email, school_id });
    if (existingEmail) throw new Error("Email already exists in this school");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let ref_id = null;

  if (role === "student") {
    const [result] = await pool.query(
      "INSERT INTO students (name, class_id, school_id, registration_number) VALUES (?, ?, ?, ?)",
      [name, class_id, school_id, registration_number]
    );
    ref_id = result.insertId;
  } else if (role === "teacher") {
    const [result] = await pool.query(
      "INSERT INTO teachers (name, subject_id, school_id) VALUES (?, ?, ?)",
      [name, subject, school_id]
    );
    ref_id = result.insertId;
  }

  const newUser = await User.create({
    name,
    email: email || null,
    registration_number: registration_number || null,
    password: hashedPassword,
    role,
    ref_id,
    school_id
  });

  return newUser;
};