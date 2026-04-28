import bycrpt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { pool } from '../config/mysql.js';

export const registerUser = async (data) => {
  const { name, email, password, role, class_id, subject, school_id } = data;

  if (!school_id) throw new Error("school_id is required");

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already in use");

  const hashedPassword = await bcrypt.hash(password, 10);

  let ref_id = null;

  if (role === "student") {
    const [result] = await pool.query(
      "INSERT INTO students (name, class_id, school_id) VALUES (?, ?, ?)",
      [name, class_id, school_id]
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
    name, email,
    password: hashedPassword,
    role, ref_id, school_id
  });

  return newUser;
};
    