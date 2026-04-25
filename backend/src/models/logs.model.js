import mongoose from "mongoose";
const LogSchema = new mongoose.Schema({
    user_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    action:{
        type:String,
        required:true
    },
    metadata:{
        type:Object,
        default:{}

    },
},{timestamps:true})
export const Log = mongoose.Model('Log',LogSchema)
