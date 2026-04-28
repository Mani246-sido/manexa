import {pool} from "../config/mysql.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from 

const registerSchool = async(req,res)=>{
    try{
        const {name, address, phone , email}=req.body;
        if(!name || !email){
            return res.status(400).json(new ApiResponse(400,"Name and email required"));

        }
         const [existing]= await pool.query("
            SELECT id FRO, schools WHERE email = ?",
        [email]);
        if(existing.length>0){
            return res.status(400).json(new ApiResponse(400,"School Already Registered"));

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
const getAllSchools = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, phone FROM schools");
    res.status(200).json(new ApiResponse(200, "Schools fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

export default { registerSchool, getAllSchools };
