import BlockedUser from "../models/BlockedUser.js";
import Category from "../models/Category.js";
import Connection from "../models/Connection.js";
import Device from "../models/Device.js";
import Location from "../models/Location.js";
import User from "../models/User.js";

import { getRandomString, isEmpty, validateLocation, verifyRequiredParams, getPhotoUrl } from "../utils/functions.js";
import { uploadPhoto } from "./attachmentController.js";

import mongoose from "mongoose";
const { isValidObjectId } = mongoose;

import bcrypt from "bcrypt";

export async function signup(req, res)
{
    const data = req.body;
    verifyRequiredParams(['name', 'email', 'password', 'aboutMe'], data, res);
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
        validateLocation(locationObject, res);

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

        res.sendResponse(userData, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function login(req, res) {
    const data = req.body;
    verifyRequiredParams(['email', 'password'], data, res);
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
        await saveUser({user_id: user._id, last_login_date: date});
        await Device.addDevice(data.pushId, data.pushType || "android", user._id);

        res.sendResponse(userData, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
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
        let userId = req.query.id;
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
            res.sendResponse({message: "User location does\'t exist"}, 201);
        }
    
        const userCategory = await Category.getCategory(userObject.category_id);
        const isFriend = await Connection.isFriend(viewerId, userId);
    
        const response = {
            id: userObject._id, 
            is_blocked: await BlockedUser.blockStatus(viewerId, userId),
            is_blocked_byme: await BlockedUser.blockStatus(userId, viewerId),
            name: String(await userObject.getDisplayName()),
            avatar: await getPhotoUrl(userObject.photo_id, "icon"),
            age: String(userObject.age),
            gender: String(userObject.gender),
            about_me: String(userObject.about_me),
            city: String(userLocation?.city || ""),
            country: String(userLocation?.country || ""),
            location: String(userLocation?.location || ""),
            is_owner: userObject.isOwner(viewerId),
            subscribed: isFriend ? 1 : 0,
            followers: await Connection.getFollowersCount(userId),
            followings: await Connection.getFollowingsCount(userId),
            category_id: Number(userObject.category_id),
            category_name: userCategory?.title ? String(userCategory.title) : ""
        };
    
        res.sendResponse(response, 200);
    } catch (error) {
        res.sendResponse({
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

        res.sendResponse({ message: "You have successfully logged out." }, 200);
        return;
    } catch(error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}