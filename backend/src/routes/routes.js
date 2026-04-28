import express from 'express';
import {registerSchool,getAllSchools} from '../controller/school.controller.js';
import { register , login,getProfile,logout,markAttendanceFromAI,markAttendance,getAttendancefun,changePassword,uploadMarks,getMarks,getResult} from '../controller/user.controller.js';
import { verifyToken,authorizeRoles } from '../middlewares/auth.middleware.js';

export const router = express.Router();
//public access wale
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/school/register").post(registerSchool);







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
