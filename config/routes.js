import express from "express";
import auth from "../middlewares/auth.js";

import { signup, login, userProfile, logout, update, updatePassword, block, unblock, socialLogin, profileStats, deleteUser } from "../controllers/UserController.js";
import { categories } from "../controllers/CategoryController.js";
import { accept, cancel, create, deleteActivity, deleteRequest, detail, edit, join, reject, requests, userActivities, mine, nearbyActivities } from "../controllers/ActivityController.js";
import { report } from "../controllers/ReportController.js";
import { conversations, inbox, messages, send } from "../controllers/conversationController.js";
import { addFriend, deleteConnection, followers, followings } from "../controllers/ConnectionController.js";

import upload from "../utils/multer.js";


const router = express.Router();

// Auth Routes
router.post("/app/signup", upload.single("photo"), signup);
router.post("/app/login", upload.none(), login);
router.post("/app/sociallogin", upload.none(), socialLogin);

router.get("/app/categories", categories);
router.get("/app/activity/map", upload.none(), nearbyActivities);

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
router.get("/app/activity/user", userActivities);
router.get("/app/activity/mine", mine);

//User Related Routes
router.post("/app/user/update", update);
router.post("/app/user/password", updatePassword);
router.post("/app/user/block", block);
router.post("/app/user/unblock", unblock);
router.get("/app/user/tabs", profileStats);
router.post("/app/user/delete", deleteUser);

//Conversation Routes
router.get("/app/conversations", conversations);
router.post("/app/sendmessage", send);
router.get("/app/messages", messages);
router.get("/app/inbox", inbox);

// Connection Routes
router.post("/app/friendship/add", addFriend);
router.post("/app/friendship/leave", deleteConnection);
router.get("/app/followers", followers);
router.get("/app/followings", followings);

router.post("/app/report", report);
router.post("/app/logout", logout);

export default router;