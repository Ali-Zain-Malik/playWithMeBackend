import BlockedUser from "../models/BlockedUser.js";
import Category from "../models/Category.js";
import Connection from "../models/Connection.js";
import Device from "../models/Device.js";
import Location from "../models/Location.js";
import User from "../models/User.js";

import { getRandomString, isEmpty, validateLocation, verifyRequiredParams, getPhotoUrl } from "../utils/functions.js";
import { uploadPhoto } from "./AttachmentController.js";

import mongoose from "mongoose";
const { isValidObjectId } = mongoose;

import bcrypt from "bcrypt";

export async function signup(req, res)
{
    const data = req.body;
    if(!verifyRequiredParams(['name', 'email', 'password', 'aboutMe'], data, res)) return;
    try {
        const values = {
            first_name: data.name?.trim(),
            email: data.email?.trim(),
            password: data.password?.trim(),
            age: data.age?.trim(),
            gender: data.gender?.trim(),
            about_me: data.aboutMe?.trim(),
            social_user_id: data.socialId?.trim() ?? 0,
            social_type: data.socialType?.trim() ?? '',
            category_id: data.category_id?.trim() ?? 0
        };
        const user = await User.getUserByEmail(values.email);
        if(!isEmpty(user)) {
            res.sendResponse({message: "Sorry, this email already exists"}, 201);
            return;
        }

        const locationObject = data.location || {};
        if(!validateLocation(locationObject, res)) return;

        values.encrypt = Buffer.from(values.password).toString("base64");
        values.password = await bcrypt.hash(values.password, 10);

        const date = new Date();
        values.creation_date = date;
        values.last_login_date = date;
        values.modified_date = date;

        const userId = await saveUser(values);
        let userObject = await User.getUserById(userId);
        if(isEmpty(userObject)) {
            res.sendResponse({message: "Error creating new user."}, 201);
            return;
        }
        // Set the session.
        req.user = userObject;

        if (req.file && req.file.path) {
            const attachmentId = await uploadPhoto(req, "primary");
            await saveUser({ user_id: userId, photo_id: attachmentId });
            userObject = await User.getUserById(userId);
        }

        locationObject.resource_id = userId;
        locationObject.resource_type = "user";
        await Location.saveLocation(locationObject);

        const userData = await userObject.getUserData();
        // Update Session
        req.user = userData;
        await Device.addDevice(data.pushId, data.pushType || "android", userId);

        return res.sendResponse(userData, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function login(req, res) {
    const data = req.body;
    if(!verifyRequiredParams(['email', 'password'], data, res)) return;
    try {
        const email = data.email?.trim();
        const password = data.password?.trim();
        const user = await User.getUserByEmail(email);
        if (isEmpty(user)) {
            res.sendResponse({message: "Invalid Login Details"}, 201);
            return;
        }
        
        if(!await user.isPasswordValid(password)) {
            res.sendResponse({message: "Invalid Login Details"}, 201);
            return;
        }

        const userData = await user.getUserData();
        // Set the session.
        req.user = userData;
        const date = new Date();
        await Promise.all([
            saveUser({user_id: user._id, last_login_date: date}),
            Device.addDevice(data.pushId, data.pushType || "android", user._id),
        ]);

        return res.sendResponse(userData, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function socialLogin(req, res) {
    try {
        const data = req.body;
        if(!verifyRequiredParams(['id', 'type'], data, res)) return;

        const social_user_id = data?.id;
        const social_type = data?.type?.trim();
        const pushId = data?.pushId || null;
        const pushType = data?.pushType || null;

        const user = await User.findOne({
            social_user_id,
            social_type,
        });

        if (isEmpty(user)) {
            return res.sendResponse({
                message: "Invalid Login Details",
                userExist: false,
            }, 201);
        }

        const userData = await user.getUserData();
        const response = {
            ...userData,
            userExist: true,
        };
        
        if (!isEmpty(pushId)) {
            await Device.addDevice(pushId, pushType, user._id);
        }

        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error }, 201);
    }
}

async function saveUser(values) {
    // Remove unwanted fields
    delete values.save;
    delete values.photo;
    delete values.device_token;
    delete values.device_type;

    let user_id;

    // If user_id is not provided, create a new user
    if (isEmpty(values.user_id)) {
        values.activation_code = getRandomString(8);
        values.apikey = getRandomString(32);
        const user = await User.create(values);
        user_id = user._id;
    } else {
        user_id = values.user_id;
        await User.updateOne({ _id: user_id }, values);
    }

    return user_id;
}

export async function userProfile(req, res) {
    try {
        let userId = req.body?.id;
        const viewerId = req.user._id;
        if(isEmpty(userId)) {
            userId = viewerId;
        }
    
        if(!isValidObjectId(userId)) {
            res.sendResponse({message: "User not found."}, 201);
            return;
        }
    
        const userObject = await User.getUserById(userId);
        if(isEmpty(userObject)) {
            res.sendResponse({message: "User not found."}, 201);
            return;
        }
    
        const userLocation = await Location.getLocation(userId, "user");
        if(isEmpty(userLocation)) {
            return res.sendResponse({message: "User location does\'t exist"}, 201);
        }
    
        const [name, avatar, userCategory, isFriend, is_blocked, is_blocked_byme, followers, followings] = await Promise.all([
            userObject.getDisplayName(),
            getPhotoUrl(userObject.photo_id, "icon"),
            Category.getCategory(userObject.category_id),
            Connection.isFriend(viewerId, userId),
            BlockedUser.blockStatus(viewerId, userId),
            BlockedUser.blockStatus(userId, viewerId),
            Connection.getFollowersCount(userId),
            Connection.getFollowingsCount(userId),
        ]);
    
        const response = {
            id: userObject._id, 
            is_blocked: is_blocked,
            is_blocked_byme: is_blocked_byme,
            name: String(name),
            avatar: avatar,
            age: String(userObject.age),
            gender: String(userObject.gender),
            about_me: String(userObject.about_me),
            city: String(userLocation?.city || ""),
            country: String(userLocation?.country || ""),
            location: String(userLocation?.location || ""),
            location_id: userLocation?._id || "",
            longitude: userLocation?.longitude || 0,
            latitude: userLocation?.latitude || 0,
            is_owner: userObject.isOwner(viewerId),
            subscribed: isFriend ? 1 : 0,
            followers: followers,
            followings: followings,
            category_id: Number(userObject.category_id),
            category_name: userCategory?.title ? String(userCategory.title) : ""
        };
    
        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function logout(req, res) {
    try{
        const token = req.body.pushId;
        const user = req.user;

        if (!isEmpty(token)) {
            await Device.updateOne(
                { user_id: user._id, push_id: token },
                { $set: { status: false } }
            );
        }
        delete req.user;

        return res.sendResponse({ message: "You have successfully logged out." }, 200);
        return;
    } catch(error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function update(req, res) {
    const data = req.body;
    const user = req.user;
    if(!verifyRequiredParams(['name', 'aboutMe'], data, res)) return;
    try {
        const values = {
            first_name: data.name?.trim(),
            age: data.age?.trim(),
            gender: data.gender?.trim(),
            about_me: data.aboutMe?.trim(),
            user_id: user._id,
            category_id: data.category_id?.trim() || 0,
        };

        const date = new Date();
        values.modified_date = date;

        if (req.file && req.file.path) {
            const attachmentId = await uploadPhoto(req, "primary");
            values.photo_id = attachmentId;
        }

        const userId = await saveUser(values);
        const userObject = await User.getUserById(userId);
        if(isEmpty(userObject)) {
            res.sendResponse({message: "Error updating user info."}, 201);
            return;
        }

        const locationArray = data.location;
        const userLocation = await Location.getLocation(user._id, "user");
        if(typeof locationArray === "object" && !isEmpty(locationArray)){
            locationArray['resource_id'] = user._id;
            if(!isEmpty(userLocation)){
                locationArray['_id'] = userLocation._id;
            }
            await Location.saveLocation(locationArray);
        }

        const userData = await userObject.getUserData();
        userData.message = "Your changes have been saved successfully.";
        return res.sendResponse(userData, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function updatePassword(req, res) {
    try {
        const user = req.user;
        const data = req.body;
        if(!verifyRequiredParams(['newPassword', 'oldPassword'], data, res)) return;

        const newPassword = data.newPassword?.trim();
        const oldPassword = data.oldPassword?.trim();

        // Check if old password is correct
        const userObject = await User.getUserById(user._id);
        if (isEmpty(userObject) || !(await userObject.isPasswordValid(oldPassword))) {
            return res.sendResponse({ message: "Invalid old password" }, 201);
        }

        const values = {
            user_id: user._id,
            encrypt: Buffer.from(newPassword).toString("base64"),
            password: await bcrypt.hash(newPassword, 10),
            modified_date: new Date()
        };

        await saveUser(values);
        return res.sendResponse({ message: "Password changed successfully." }, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function block(req, res) {
    try {
        const owner_id = req.user._id;
        const user_id = req.body.user_id;

        if(!verifyRequiredParams(['user_id'], req.body, res)) return;
        if (!isValidObjectId(user_id)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }

        const alreadyBlocked = await BlockedUser.blockStatus(user_id, owner_id);
        if (alreadyBlocked) {
            return res.sendResponse({ message: "You have already blocked this user." }, 201);
        }

        const blocked = await BlockedUser.create({ user_id, owner_id });
        if (isEmpty(blocked)) {
            return res.sendResponse({ message: "Unable to block user." }, 201);
        }

        return res.sendResponse({ message: "User blocked successfully." }, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function unblock(req, res) {
    try {
        const owner_id = req.user._id;
        const user_id = req.body.user_id;

        if(!verifyRequiredParams(['user_id'], req.body, res)) return;
        if (!isValidObjectId(user_id)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }

        const isBlocked = await BlockedUser.blockStatus(user_id, owner_id);
        if (!isBlocked) {
            return res.sendResponse({ message: "You have not blocked this user." }, 201);
        }

        await BlockedUser.deleteOne({ user_id, owner_id });

        return res.sendResponse({ message: "User unblocked successfully." }, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function profileStats(req, res) {
     try {
        const viewer = req.user;
        const data = req.body;

        const categoryId = data?.categoryId || 0;
        const date = data?.date || new Date().toISOString().slice(0, 10);
        const time = data?.time || new Date().toTimeString().slice(0, 8);
        const userId = data?.id || viewer._id;
        const dateTime = new Date(`${date}T${time}`);

        if(!isValidObjectId(userId)) {
            return res.sendResponse({ message: "User not found." }, 201);
        }

        const userObject = await User.getUserById(userId);
        if (isEmpty(userObject)) {
            return res.sendResponse({ message: "User not found." }, 201);
        }

        const [activitiesCount, followersCount, followingsCount] = await Promise.all([
            userObject.getActivitiesCount(dateTime, categoryId),
            Connection.getFollowersCount(userId),
            Connection.getFollowingsCount(userId),
        ]);

        return res.sendResponse({
            activities: activitiesCount,
            followers: followersCount,
            followings: followingsCount,
        }, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal Server Error", error }, 201);
    }
}

export async function deleteUser(req, res) {
    try {
        const userId = req.user?._id;
        if(!isValidObjectId(userId)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }

        const user = await User.getUserById(userId);
        if(isEmpty(user)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }

        await user.delete();
        return res.sendResponse({ message: "User deleted successfully." }, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error" }, 201);
    }
}