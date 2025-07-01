import express from "express";
import auth from "../middlewares/auth.js";

import { signup, login, userProfile, logout } from "../controllers/userController.js";
import { categories } from "../controllers/CategoryController.js";
import { accept, cancel, create, edit, join, reject } from "../controllers/ActivityController.js";

import upload from "../utils/multer.js";


const router = express.Router();

// Auth Routes
router.post("/app/signup", upload.single("photo"), signup);
router.post("/app/login", upload.none(), login);

router.get("/app/categories", categories);

router.use(auth);

router.get("/app/user", userProfile);

router.use(upload.none());

// Activity Routes
router.post("/app/activity/create", create);
router.post("/app/activity/edit", edit);
router.post("/app/activity/join", join);
router.post("/app/activity/accept", accept);
router.post("/app/activity/reject", reject);
router.post("/app/activity/cancel", cancel);

router.post("/app/logout", logout);

export default router;