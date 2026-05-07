import express from 'express';
import {registerSchool,getAllSchools} from '../controller/school.controller.js';
import { register , login,getProfile,logout,markAttendanceFromAI,markAttendance,getAttendancefun,changePassword,uploadMarks,getMarks,getResult} from '../controller/user.controller.js';
import { verifyToken,authorizeRoles } from '../middlewares/auth.middleware.js';
import {registerFace,getFaceStatus,deleteFace} from '../controller/face.controller.js';
import {upload} from "../config/multer.js"
import { checkLowAttendance, getNotifications, markAsRead, markAllAsRead } from '../controller/notification.controller.js';
import { createFeeStructure,generateInvoices, getFeeStructures, recordPayment, getMyInvoices, getAllInvoices, getDefaulters } from '../controller/fee.controller.js';

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
