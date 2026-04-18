import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
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
  ref_id: {//sql for stpring records
    type: Number,
    required: false
  }
}, { timestamps: true });

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};



export const User = mongoose.model('User', userSchema);