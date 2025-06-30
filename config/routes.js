import express from "express";
import auth from "../middlewares/auth.js";

import { signup, login, userProfile, logout } from "../controllers/userController.js";
import { categories } from "../controllers/CategoryController.js";
import { create, edit } from "../controllers/ActivityController.js";

import upload from "../utils/multer.js";


const router = express.Router();

// Auth Routes
router.post("/app/signup", upload.single("photo"), signup);
router.post("/app/login", upload.none(), login);
router.post("/app/logout", auth, upload.none(), logout);

router.get("/app/user", auth, userProfile);
router.get("/app/categories", categories);
router.post("/app/activity/create", auth, upload.none(), create);
router.post("/app/activity/edit", auth, upload.none(), edit);

export default router;