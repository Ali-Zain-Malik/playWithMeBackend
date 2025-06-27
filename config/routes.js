import express from "express";
import auth from "../middlewares/auth.js";

import { signup } from "../controllers/userController.js";
import upload from "../utils/multer.js";


const router = express.Router();

// Auth Routes
router.post("/app/signup", upload.single("photo"), signup);

export default router;