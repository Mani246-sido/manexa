import express from 'express';
import { register , login,getProfile,logout} from '../controller/user.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

export const router = express.Router();
//public access wale
router.route("/register").post(register);
router.route("/login").post(login);





//ye hoga verify 
router.route("/profile").get(verifyToken,getProfile);
router.route("/logout").post(verifyToken,logout);



export default router;
