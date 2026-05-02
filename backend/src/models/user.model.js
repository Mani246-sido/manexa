import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true
  },
  registration_number: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "teacher", "student"],
    default: "student"
  },
  school_id: {
    type: Number,
    required: true
  },
  ref_id: {
    type: Number,
    required: false
  },
  refreshToken: {
    type: String
  }
}, { timestamps: true });

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
      school_id: this.school_id,
      ref_id: this.ref_id,
      registration_number: this.registration_number
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

export const User = mongoose.model('User', userSchema);