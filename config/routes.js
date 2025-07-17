import express from "express";
import auth from "../middlewares/auth.js";

import { signup, login, userProfile, logout, update, updatePassword, block, unblock, profileStats, deleteUser } from "../controllers/UserController.js";
import { categories } from "../controllers/CategoryController.js";
import { accept, cancel, create, deleteActivity, deleteRequest, detail, edit, join, reject, requests } from "../controllers/ActivityController.js";

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
router.post("/app/activity/delete", deleteActivity);
router.post("/app/activity/deleteRequest", deleteRequest);
router.get("/app/activity/requests", requests);
router.get("/app/activity/detail", detail);


//User Related Routes
router.post("/app/user/update", update);
router.post("/app/user/password", updatePassword);
router.post("/app/user/block", block);
router.post("/app/user/unblock", unblock);
router.get("/app/user/tabs", profileStats);
router.post("/app/user/delete", deleteUser);

router.post("/app/logout", logout);

export default router;