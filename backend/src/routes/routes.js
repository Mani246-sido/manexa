import express from 'express';
import { register , login,getProfile,logout} from '../controller/user.controller.js';
import { verifyToken,authorizeRoles } from '../middlewares/auth.middleware.js';

export const router = express.Router();
//public access wale
router.route("/register").post(register);
router.route("/login").post(login);





//ye hoga verify 
router.route("/profile").get(verifyToken,getProfile);
router.route("/logout").post(verifyToken,logout);
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



export default router;
