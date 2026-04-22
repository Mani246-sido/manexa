import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import { registerUser } from "../auth/auth.service"
import bcrypt from "bcrypt"
import { sendLoginEmail } from "../utils/emailvariable.js"
import { pool } from "../config/mysql.js"
import fs from "fs"
import axios from "axios"
import FormData from "form-data"


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
        const {username,email,password,role,class_id,subject} = req.body;
        const newUser = await registerUser({username,email,password,role,class_id,subject});
        res.status(201).json(new ApiResponse(201,"User registered successfully",newUser));

        
    } catch (error) {
        res.status(400).json(new ApiResponse(400,error.message));

        
    }

}
//krle login bhai
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json(new ApiResponse(404, "User not found"));
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json(new ApiResponse(401, "Invalid credentials"));
    }

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshToken(user._id);

    sendLoginEmail(user, req);

    res.status(200).json(
      new ApiResponse(200, "Login successful", {
        accessToken,
        refreshToken,
      })
    );

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
    // check image
    if (!req.file) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Image is required"));
    }

    // prepare form-data for python
    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path));

    //  python service
    const response = await axios.post(
      "http://localhost:5001/recognize-face",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 5000
      }
    );

    const { student_id, matched } = response.data;

    // 4check result
    if (!matched || !student_id) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Face not recognized"));
    }

    //  mark 
    await pool.query(
      `INSERT INTO attendance (student_id, date, status)
       VALUES (?, CURDATE(), 'present')
       ON DUPLICATE KEY UPDATE status='present'`,
      [student_id]
    );

    // cleanup temp file 
    fs.unlinkSync(req.file.path);

    return res.json(
      new ApiResponse(200, "Attendance marked via AI", {
        student_id
      })
    );

  } catch (error) {
    console.error("AI Attendance Error:", error.message);

    return res.status(500).json(
      new ApiResponse(500, "AI attendance failed", {
        error: error.message
      })
    );
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
//getpercentage



export default{
    register,
    login,
    getProfile,
    logout,
    getattendancefun,
    markAttendance,
    uploadMarks,
    markAttendanceFromAI 


}
