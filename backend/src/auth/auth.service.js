import bycrpt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

export const registerUser = async(data)=>{
    const {username,email,password,role,class_id,subject} = data;

    const existingUser = await User.findOne({email});
    if(existingUser){
        throw new Error('Email already in use');
    }

    const hashedPassword = await bycrpt.hash(password,10);

    let ref_id = null;

    if (role === "student") {
    const [result] = await pool.query(
      "INSERT INTO students (name, class_id) VALUES (?, ?)",
      [name, class_id]
    );

    ref_id = result.insertId;
  }

  else if (role === "teacher") {
    const [result] = await pool.query(
      "INSERT INTO teachers (name, subject) VALUES (?, ?)",
      [name, subject]
    );

    ref_id = result.insertId;
}
    const newUser= await username.create({username,email,password:hashedPassword,role,ref_id});
    return newUser;
    
};
