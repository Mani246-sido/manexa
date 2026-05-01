import bycrpt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { pool } from '../config/mysql.js';

export const registerUser = async (data) => {
  const { name, email, password, role, class_id, subject, school_id, registration_number} = data;

 if (role === "student" && !registration_number){
  throw new Error("Registration number is required for students");
 }
 if(role ==="teacher" && !email){
  throw new Error("Email is required for teachers");

 }
 if(role === "student"){
  const existing = await User.findOne({registration_number});
  if(existing){
    throw new Error("Registration number already exists");
  }
  const existing = await User.findOne({email});
  if(existing){
    throw new Error("Email already exists");
  }
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
    registration_number: registration_number || null,//idhr check krna h ki isse mandatory rkhna h ya nhi 
    password: hashedPassword,
    role, ref_id, school_id
  });

  return newUser;
};
    