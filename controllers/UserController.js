import Device from "../models/Device.js";
import Location from "../models/Location.js";
import User from "../models/User.js";

import { getRandomString, isEmpty, validateLocation, verifyRequiredParams } from "../utils/functions.js";
import { uploadPhoto } from "./attachmentController.js";

import crypto from "crypto";

export async function signup(req, res)
{
    const data = req.body;
    verifyRequiredParams(['name', 'email', 'password','age', 'gender', 'aboutMe'], data, res);
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
        values.password = crypto.createHash("md5").update(values.password).digest("hex");

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