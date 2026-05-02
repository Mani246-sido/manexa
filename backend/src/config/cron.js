import cron from 'node-cron';
import { pool } from './mysql.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';

export const startCronJobs = () => {

  // Har roz raat 11 baje chalega
  cron.schedule('0 23 * * *', async () => {
    console.log('Running low attendance check...');

    try {
      const [schools] = await pool.query("SELECT id FROM schools");

      for (const school of schools) {
        const school_id = school.id;

        const [students] = await pool.query(
          "SELECT id, name FROM students WHERE school_id = ?",
          [school_id]
        );

        if (!students.length) continue;

        const teacherUsers = await User.find({ school_id, role: "teacher" });
        const notificationsToCreate = [];

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
            const studentUser = await User.findOne({
              ref_id: student.id,
              role: "student",
              school_id
            });

            if (studentUser) {
              notificationsToCreate.push({
                user_id: studentUser._id,
                title: "Low Attendance Alert ⚠️",
                message: `Your attendance is ${percentage.toFixed(2)}% which is below 75%.`,
                type: "warning"
              });
            }

            for (const teacher of teacherUsers) {
              notificationsToCreate.push({
                user_id: teacher._id,
                title: "Low Attendance Alert ⚠️",
                message: `Student ${student.name} has ${percentage.toFixed(2)}% attendance.`,
                type: "warning"
              });
            }
          }
        }

        if (notificationsToCreate.length) {
          await Notification.insertMany(notificationsToCreate);
          console.log(`School ${school_id}: ${notificationsToCreate.length} notifications sent`);
        }
      }

    } catch (error) {
      console.error("Cron job error:", error.message);
    }
  });

  console.log('Cron jobs started ✅');
};