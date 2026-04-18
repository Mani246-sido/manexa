import mongoose from "mongoose";
const FaceSchema = new mongoose.Schema({
    student_id:{
        type:Number,
        required:true
    },
    encoding:{
        type:Array, 
        required:true
    },
    image_url: {
    type: String
  }
}, { timestamps: true });
    
export const Face = mongoose.model('Face', FaceSchema);