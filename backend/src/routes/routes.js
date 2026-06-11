/*
import express from 'express';
import {registerSchool,getAllSchools} from '../controller/school.controller.js';
import { register , login,getProfile,logout,markAttendanceFromAI,markAttendance,getAttendancefun,changePassword,uploadMarks,getMarks,getResult} from '../controller/user.controller.js';
import { verifyToken,authorizeRoles } from '../middlewares/auth.middleware.js';
import {registerFace,getFaceStatus,deleteFace} from '../controller/face.controller.js';
import {upload} from "../config/multer.js"
import { checkLowAttendance, getNotifications, markAsRead, markAllAsRead } from '../controller/notification.controller.js';
import { createFeeStructure,
  getFeeStructures,
  generateInvoices,
  recordPayment,
  getMyInvoices,
  getAllInvoices,
  getDefaulters,
  getPaymentHistory,
  getCollectionSummary } from '../controller/fee.controller.js';
import {
  createTimetable,
  getStudentTimetable,
  getTeacherTimetable,
  deleteTimetable
} from "../controllers/timetable.controller.js";
export const router = express.Router();
//public access wale
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/school/register").post(registerSchool);
router.route("/schools/list").get(getSchoolsList);
//schools
router.route("/schools").get(verifyToken,authorizeRoles("admin"),getAllSchools);

//face routes
router.route("/face/register").post(verifyToken,authorizeRoles("teacher","admin"),registerFace);
router.route("/face/status").get(verifyToken,authorizeRoles("teacher","admin"),getFaceStatus);
router.route("/face/:student_id").delete(verifyToken,authorizeRoles("teacher","admin"),deleteFace);
//notification routes
router.route("/notifications").get(verifyToken,getNotifications);
router.route("/notifications/read-all").patch(verifyToken,markAllAsRead);
router.route("/notifications/:id/read").patch(verifyToken,markAsRead);

//low attendance notification check
router.route("/attendance/check-low").post(verifyToken,authorizeRoles("teacher","admin"),checkLowAttendance);
//fee routes
router.route("/fee-structures").get(verifyToken,authorizeRoles("teacher","admin"),getFeeStructures);
router.route("/fee-structures").post(verifyToken,authorizeRoles("teacher","admin"),createFeeStructure);
router.route("/fee/generate-invoices").post(verifyToken,authorizeRoles("teacher","admin"),generateInvoices);
router.route("/fee/payement").post(verifyToken,authorizeRoles("teacher","admin"),recordPayment);
router.route("/fee/imvoices").get(verifyTokens,authorizeRoles("admin","teacher"),getAllInvoices);
router.route("/fee/my-invoices").get(verifyToken,authorizeRoles("student","parent"),getMyInvoices);
router.route("/fee/defaulters").get(verifyToken,authorizeRoles("teacher","admin"),getDefaulters);
router.route("/fee/payements").get(verifyToken,authorizeRoles("teacher","admin"),getPayementHistory);
router.route("/fee/summary").get(verifyToken,authorizeRoles("teacher","admin"),getCollectionSummary);
//timetable routes
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  createTimetable
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteTimetable
);

// Student
router.get(
  "/student",
  verifyToken,
  authorizeRoles("student"),
  getStudentTimetable
);

// Teacher
router.get(
  "/teacher",
  verifyToken,
  authorizeRoles("teacher"),
  getTeacherTimetable
);



//ye hoga verify 
router.route("/profile").get(verifyToken,getProfile);
router.route("/change-password").post(verifyToken,changePassword);
router.route("/logout").post(verifyToken,logout);
router.route("/schools").get(verifyToken,authorizeRoles("admin"),getAllSchools)
router.post(
  "/marks",
  verifyToken,
  authorizeRoles("teacher"),
  uploadMarks
);

router.get(
  "/marks",
  verifyToken,
  authorizeRoles("student"),
  getMarks
);

router.get(
  "/result",
  verifyToken,
  authorizeRoles("student"),
  getResult
);
router.post("/attendance", verifyToken, authorizeRoles("teacher", "admin"), markAttendance);
router.get("/attendance", verifyToken, authorizeRoles("student"), getAttendancefun);
router.post("/attendance/ai", verifyToken, upload.single("image"), markAttendanceFromAI);



export default router;
*/
import express from "express";
import {
  applyLeave, getMyLeaves, getAllLeaves, getLeaveById,
  approveLeave, rejectLeave, cancelLeave, getLeaveStats,
} from "../controller/leave.controller.js";

import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controller/announcement.controller.js";
import schoolController from "../controller/school.controller.js";
import userController from "../controller/user.controller.js";
import { markAttendanceFromAI } from "../controller/user.controller.js";
import adminController from "../controller/admin.controller.js";
import faceController from "../controller/face.controller.js";
import feeController from "../controller/fee.controller.js";
import {
  checkLowAttendance,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controller/notification.controller.js";
import {
  createTimetable,
  getStudentTimetable,
  getTeacherTimetable,
  deleteTimetable,
} from "../controller/timetable.controller.js";

// ── Middleware
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../config/multer.js";

export const router = express.Router();


router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/school/register", schoolController.registerSchool);
router.get("/schools/list", schoolController.getSchoolsList); // login dropdown

router.get("/profile", verifyToken, userController.getProfile);
router.post("/change-password", verifyToken, userController.changePassword);
router.post("/logout", verifyToken, userController.logout);


router.get(
  "/schools",
  verifyToken,
  authorizeRoles("admin"),
  schoolController.getAllSchools
);
router.get(
  "/dashboard/stats",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getDashboardStats
);

// ── Students (Admin) =
router.get(
  "/admin/students",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getAllStudents
);
router.put(
  "/admin/students/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminController.updateStudent
);
router.delete(
  "/admin/students/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminController.deleteStudent
);
router.patch(
  "/admin/students/:id/reset-password",
  verifyToken,
  authorizeRoles("admin"),
  adminController.resetStudentPassword
);

// ── Teachers (Admin) 
router.get(
  "/admin/teachers",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getAllTeachers
);
router.put(
  "/admin/teachers/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminController.updateTeacher
);
router.delete(
  "/admin/teachers/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminController.deleteTeacher
);
router.patch(
  "/admin/teachers/:id/reset-password",
  verifyToken,
  authorizeRoles("admin"),
  adminController.resetTeacherPassword
);

// ── Classes (Admin) 
router.get(
  "/classes",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  adminController.getAllClasses
);
router.post(
  "/classes",
  verifyToken,
  authorizeRoles("admin"),
  adminController.createClass
);
router.delete(
  "/classes/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminController.deleteClass
);

// ── Subjects (Admin) 
router.get(
  "/subjects",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  adminController.getAllSubjects
);
router.post(
  "/subjects",
  verifyToken,
  authorizeRoles("admin"),
  adminController.createSubject
);
router.delete(
  "/subjects/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminController.deleteSubject
);

// Manual — Teacher/Admin
router.post(
  "/attendance",
  verifyToken,
  authorizeRoles("teacher", "admin"),
  userController.markAttendance
);

// AI face recognition — Teacher/Admin (image upload)
router.post(
  "/attendance/ai",
  verifyToken,
  authorizeRoles("teacher", "admin"),
  upload.single("image"),
  markAttendanceFromAI
);

// Student apni attendance dekhe
router.get(
  "/attendance",
  verifyToken,
  authorizeRoles("student"),
  userController.getAttendance
);

// Low attendance check — manual trigger
router.post(
  "/attendance/check-low",
  verifyToken,
  authorizeRoles("teacher", "admin"),
  checkLowAttendance
);


router.post(
  "/marks",
  verifyToken,
  authorizeRoles("teacher"),
  userController.uploadMarks
);
router.get(
  "/marks",
  verifyToken,
  authorizeRoles("student"),
  userController.getMarks
);
router.get(
  "/result",
  verifyToken,
  authorizeRoles("student"),
  userController.getResult
);


router.post(
  "/face/register",
  verifyToken,
  authorizeRoles("teacher", "admin"),
  upload.single("image"),
  faceController.registerFace
);
router.get(
  "/face/status",
  verifyToken,
  authorizeRoles("teacher", "admin"),
  faceController.getFaceStatus
);
router.delete(
  "/face/:student_id",
  verifyToken,
  authorizeRoles("teacher", "admin"),
  faceController.deleteFace
);


router.post(
  "/timetable",
  verifyToken,
  authorizeRoles("admin"),
  createTimetable
);
router.get(
  "/timetable/student",
  verifyToken,
  authorizeRoles("student"),
  getStudentTimetable
);
router.get(
  "/timetable/teacher",
  verifyToken,
  authorizeRoles("teacher"),
  getTeacherTimetable
);
router.delete(
  "/timetable/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteTimetable
);


router.get(
  "/fee-structures",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  feeController.getFeeStructures
);
router.post(
  "/fee-structures",
  verifyToken,
  authorizeRoles("admin"),
  feeController.createFeeStructure
);
router.post(
  "/fee/generate-invoices",
  verifyToken,
  authorizeRoles("admin"),
  feeController.generateInvoices
);
router.post(
  "/fee/payment",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  feeController.recordPayment
);
router.get(
  "/fee/invoices",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  feeController.getAllInvoices
);
router.get(
  "/fee/my-invoices",
  verifyToken,
  authorizeRoles("student"),
  feeController.getMyInvoices
);
router.get(
  "/fee/defaulters",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  feeController.getDefaulters
);
router.get(
  "/fee/payments",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  feeController.getPaymentHistory
);
router.get(
  "/fee/summary",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  feeController.getCollectionSummary
);
//notifications
router.get("/notifications", verifyToken, getNotifications);
router.patch("/notifications/read-all", verifyToken, markAllAsRead);
router.patch("/notifications/:id/read", verifyToken, markAsRead);
router.post(
  "/announcements",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  createAnnouncement
);
router.get("/announcements", verifyToken, getAnnouncements);
router.get("/announcements/:id", verifyToken, getAnnouncementById);
router.put(
  "/announcements/:id",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  updateAnnouncement
);
router.delete(
  "/announcements/:id",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  deleteAnnouncement
);
router.post("/leaves", verifyToken, authorizeRoles("student"), upload.single("attachment"), applyLeave);
router.get("/leaves/my", verifyToken, authorizeRoles("student"), getMyLeaves);
router.patch("/leaves/:id/cancel", verifyToken, authorizeRoles("student"), cancelLeave);
router.get("/leaves", verifyToken, authorizeRoles("teacher", "admin"), getAllLeaves);
router.get("/leaves/stats", verifyToken, authorizeRoles("teacher", "admin"), getLeaveStats);
router.get("/leaves/:id", verifyToken, authorizeRoles("teacher", "admin", "student"), getLeaveById);
router.patch("/leaves/:id/approve", verifyToken, authorizeRoles("teacher", "admin"), approveLeave);
router.patch("/leaves/:id/reject", verifyToken, authorizeRoles("teacher", "admin"), rejectLeave);

export default router;
