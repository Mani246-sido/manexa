import mongoose from "mongoose";
const NotificationSchema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    title:String,

    message:{
        type:String,
        required:true   
    },
    type:{
        type:String,
        enum:["info","warning","success"],
        default:"info"
    },
    read:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });
export const Notification = mongoose.model("notification ",NotificationSchema  )