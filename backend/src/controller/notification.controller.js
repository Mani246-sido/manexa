import { Notification } from "../models/notification.model.js";
import { pool } from "../config/mysql.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";


export const checkLowAttendance = async (req, res) => {
  try {
    const school_id = req.user.school_id; // sirf us school ke students

    // school ke saare students fetch karo
    const [students] = await pool.query(
      "SELECT id, name FROM students WHERE school_id = ?",
      [school_id]
    );

    if (!students.length) {
      return res.status(404).json(new ApiResponse(404, "No students found"));
    }

    // teachers ek baar hi fetch karo — loop ke bahar
    const teacherUsers = await User.find({ school_id, role: "teacher" });

    const lowAttendanceStudents = [];
    const notificationsToCreate = []; // bulk insert ke liye

    for (const student of students) {
      const [total] = await pool.query(
        "SELECT COUNT(*) as total FROM attendance WHERE student_id = ? AND school_id = ?",
        [student.id, school_id]
      );

      const [present] = await pool.query(
        "SELECT COUNT(*) as present FROM attendance WHERE student_id = ? AND school_id = ? AND status = 'present'",
        [student.id, school_id]
      );

      const totalDays = total[0].total;
      const presentDays = present[0].present;

      if (totalDays === 0) continue;

      const percentage = (presentDays / totalDays) * 100;

      if (percentage < 75) {
        lowAttendanceStudents.push({
          student_id: student.id,
          name: student.name,
          percentage: percentage.toFixed(2)
        });

        // student user fetch karo
        const studentUser = await User.findOne({
          ref_id: student.id,
          role: "student",
          school_id  // school_id filter — dusre school ka student na aaye
        });

        if (studentUser) {
          notificationsToCreate.push({
            user_id: studentUser._id,
            title: "Low Attendance Alert ⚠️",
            message: `Your attendance is ${percentage.toFixed(2)}% which is below 75%. Please improve your attendance.`,
            type: "warning"
          });
        }

        // saare teachers ko notify karo — already fetched hai loop ke bahar
        for (const teacher of teacherUsers) {
          notificationsToCreate.push({
            user_id: teacher._id,
            title: "Low Attendance Alert ⚠️",
            message: `Student ${student.name} has ${percentage.toFixed(2)}% attendance which is below 75%.`,
            type: "warning"
          });
        }
      }
    }

    // ek baar mein saari notifications insert karo
    if (notificationsToCreate.length) {
      await Notification.insertMany(notificationsToCreate);
    }

    return res.status(200).json(new ApiResponse(200, "Low attendance check completed", {
      low_attendance_count: lowAttendanceStudents.length,
      students: lowAttendanceStudents
    }));

  } catch (error) {
    return res.status(500).json(new ApiResponse(500, error.message));
  }
};


export const getNotifications = async (req, res) => {
  try {
    // sirf us user ki notifications — school_id ki zaroorat nahi
    // kyunki user_id already unique identifier hai
    const notifications = await Notification.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json(new ApiResponse(200, "Notifications fetched", notifications));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, error.message));
  }
};
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // user_id filter — dusre school ka user kisi aur ki notification mark na kar sake
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json(new ApiResponse(404, "Notification not found"));
    }

    return res.status(200).json(new ApiResponse(200, "Marked as read", notification));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, error.message));
  }
};


export const markAllAsRead = async (req, res) => {
  try {
    // user_id filter — sirf apni notifications mark hogi
    await Notification.updateMany(
      { user_id: req.user.id, read: false },
      { read: true }
    );

    return res.status(200).json(new ApiResponse(200, "All notifications marked as read"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, error.message));
  }
};

export default { checkLowAttendance, getNotifications, markAsRead, markAllAsRead };