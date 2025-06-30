import express from "express";
import auth from "../middlewares/auth.js";

import { signup, login, userProfile, logout } from "../controllers/userController.js";

import upload from "../utils/multer.js";


const router = express.Router();

// Auth Routes
router.post("/app/signup", upload.single("photo"), signup);
router.post("/app/login", upload.none(), login);
router.post("/app/logout", auth, upload.none(), logout);

router.get("/app/user", auth, userProfile);

export default router;