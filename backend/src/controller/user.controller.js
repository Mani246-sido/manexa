import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import { registerUser } from "../auth/auth.service.js"
import bcrypt from "bcrypt"
import { sendLoginEmail, sendPasswordChangeEmail } from "../utils/emailvariable.js"
import { pool } from "../config/mysql.js"
import fs from "fs"
import axios from "axios"
import FormData from "form-data"
import { Face } from "../models/face.model.js"


import {ApiError} from "../utils/ApiError.js"


export const generateAccessAndRefreshToken = async (userId) => {
  try {
    //  Find user
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    //  Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    //  Return tokens
    return {
      accessToken,
      refreshToken
    };

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Something went wrong while generating tokens"
    );
  }
};



// Register a new user
const register = async(req,res)=>{
    try {
        const {username,email,password,role,class_id} = req.body;
        const newUser = await registerUser({username,email,password,role,class_id});
        res.status(201).json(new ApiResponse(201,"User registered successfully",newUser));

        
    } catch (error) {
        res.status(400).json(new ApiResponse(400,error.message));

        
    }

}
//krle login bhai
const login = async (req, res) => {
  try {
    const { email, registration_number, password } = req.body;

    // email ya registration_number dono mein se ek hona chahiye
    if (!password || (!email && !registration_number)) {
      return res.status(400).json(new ApiResponse(400, "Credentials required"));
    }

  
    let user;
    if (registration_number) {
      user = await User.findOne({ registration_number });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) return res.status(404).json(new ApiResponse(404, "User not found"));

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
      role: user.role
    }));

  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};
// user profile
const getProfile = async(req,res)=>{
    try {
        const user = await User.findById(req.user.id).select("-password");
        if(!user){
            return res.status(403).json(new ApiResponse(403,"User not found"));
        }
        res.status(200).json(new ApiResponse(200,"User profile fetched successfully",user));


        
    } catch (error) {
        res.status(500).json(new ApiResponse(500,error.message));

        
    }
};
//changepass
const changePassword = async(req,res)=>{
  try {
    const {currentPassword,newPassword} = req.body;
    if(!currentPassword || !newPassword){
      return res.status(400).json(new ApiResponse(400,"Current and new password are required"));
    }
      const user = await User.findById(req.user.id);
      if(!user){
        return res.status(403).json(new ApiResponse(403,"User not found"));
      }
      const isMatch = await bcrypt.compare(currentPassword,user.password);
      if(!isMatch){
        return res.status(401).json(new ApiResponse(401,"Current password is incorrect"));
      }
      user.password = await bcrypt.hash(newPassword,10);
      await user.save({validateBeforeSave:false});
      try {
        
        await sendPasswordChangeEmail(user, req);
      } catch (error) {
        console.error("Password change email failed:", error.message); // password change block mat karo
        
      }
      res.status(200).json(new ApiResponse(200,"Password changed successfully"));
  } catch (error) {
    res.status(500).json(new ApiResponse(500,error.message));
    
  }
};

//logout
const logout = async(req,res)=>{
    try {
        const user = await User.findById(req.user.id);
        if(!user){
            return res.status(403).json(new ApiResponse(403,"User not found"));
        }
        user.refreshToken = null;
        await user.save({validateBeforeSave:false});
        res.status(200).json(new ApiResponse(200,"Logout successful"));

    }catch (error) {
        res.status(500).json(new ApiResponse(500,error.message));
    }
};
//attendance mark using ai 
export const markAttendanceFromAI = async (req, res) => {
  try {
    const { image } = req.body; // base64 image

    if (!image) {
      return res.status(400).json(new ApiResponse(400, "Image is required"));
    }

    // us class ke saare students fetch karo
    const [students] = await pool.query(
      "SELECT id FROM students WHERE school_id = ?",
      [req.user.school_id]
    );

    if (!students.length) {
      return res.status(404).json(new ApiResponse(404, "No students found"));
    }

    const studentIds = students.map(s => s.id);

    // MongoDB se un students ki encodings fetch karo
    const faces = await Face.find({
      student_id: { $in: studentIds }
    });

    if (!faces.length) {
      return res.status(404).json(new ApiResponse(404, "No faces registered yet"));
    }

    const known_encodings = faces.map(f => ({
      student_id: f.student_id,
      encoding: f.encoding
    }));

    // python ko image + encodings bhejo
    const response = await axios.post(
      "http://localhost:5001/recognize-face",
      { image, known_encodings },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );

    const { matched, student_id } = response.data;

    if (!matched || !student_id) {
      return res.status(400).json(new ApiResponse(400, "Face not recognized"));
    }

    // attendance mark karo
    await pool.query(
      `INSERT INTO attendance (student_id, date, status, school_id)
       VALUES (?, CURDATE(), 'present', ?)
       ON DUPLICATE KEY UPDATE status='present'`,
      [student_id, req.user.school_id]
    );

    return res.status(200).json(new ApiResponse(200, "Attendance marked via AI", {
      student_id
    }));

  } catch (error) {
    console.error("AI Attendance Error:", error.message);
    return res.status(500).json(new ApiResponse(500, "AI attendance failed", {
      error: error.message
    }));
  }
};


//marking attendance function
const markAttendance = async(req,res)=>{
    try {
        const {student_id} = req.body;

        await pool.query(
            `insert into attendance (student_id,date,status) values (?,curdate(),'present') ON DUPLICATE KEY UPDATE status='present'`,
            [student_id]
        );
        res.status(200).json(new ApiResponse(200,"Attendance marked by teacher"));
        
    } catch (error) {
        res.status(500).json(new ApiResponse(500,error.message));
        
    }
};
//attendance mark krne ka function //incase ai na chle to
const getattendancefun=async(req,res)=>{
    try {
        const studentid= req.user.ref_id;
        const [rows]  = await pool.query(
            "select * from attendance where student_id = ? order by date desc",
            [studentid]
        )
        res.status(200).json(new ApiResponse(200,"Attendance fetched successfully",rows));
    } catch (error) {
        res.status(500).json(new ApiResponse(500,error.message));
        
    }
};
//putmarks
const uploadMarks = async(req,res)=>{
    try {
        const {student_id,subject,marks,grade} = req.body;
        if(!student_id || !subject || !marks || !grade){
            return res.status(400).json(new ApiResponse(400,"All fields are required"));
        }
        await pool.query(
            `insert into marks (student_id,subject,marks) values (?,?,?)
            ON DUPLICATE KEY UPDATE marks = ?, grade = ?`,
            [student_id,subject,marks,grade]
        );
        res.status(200).json(new ApiResponse(200,"Marks uploaded successfully"));
        
    } catch (error) {
        res.status(500).json(new ApiResponse(500,error.message));
    }
};
//getmarks
const getMarks = async (req, res) => {
  try {
    const studentId = req.user.ref_id;
    const [rows] = await pool.query(
      `SELECT m.marks, m.grade, s.subject_name
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = ?`,
      [studentId]
    );
    res.status(200).json(new ApiResponse(200, "Marks fetched successfully", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};
 
//getpercentage
const getResult = async (req, res) => {
  try {
    const studentId = req.user.ref_id;
    const [rows] = await pool.query(
      `SELECT m.marks, m.grade, s.subject_name
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = ?`,
      [studentId]
    );
 
    if (!rows.length) {
      return res.status(404).json(new ApiResponse(404, "No result found"));
    }
 
    const totalMarks = rows.reduce((sum, r) => sum + r.marks, 0);
    const maxMarks = rows.length * 100; 
    const percentage = ((totalMarks / maxMarks) * 100).toFixed(2);
 
    let overallGrade = "F";
    if (percentage >= 90) overallGrade = "A+";
    else if (percentage >= 80) overallGrade = "A";
    else if (percentage >= 70) overallGrade = "B";
    else if (percentage >= 60) overallGrade = "C";
    else if (percentage >= 50) overallGrade = "D";
 
    res.status(200).json(new ApiResponse(200, "Result fetched successfully", {
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



export default{
    register,
    login,
    getProfile,
    logout,
    getattendancefun,
    markAttendance,
    uploadMarks,
    markAttendanceFromAI,
    getMarks,
    getResult,
    changePassword,
    
     


}
