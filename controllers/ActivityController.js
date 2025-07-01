import mongoose from "mongoose";
const { isValidObjectId } = mongoose;

import Activity from "../models/Activity.js";
import Connection from "../models/Connection.js";
import Location from "../models/Location.js";
import NotificationType from "../models/NotificationType.js";

import { verifyRequiredParams, validateLocation, formatDateTime, isEmpty } from "../utils/functions.js";
import ActivityRequest from "../models/ActivityRequest.js";

export async function create(req, res) {
    try {
        const data = req.body;
        verifyRequiredParams(['categoryId', 'date', 'time', 'activity', 'description', 'number', 'startAge', 'endAge', 'skill', 'gender'], data, res);
        validateLocation(data.location, res);
        
        const date = data.date || new Date();
        const time = data.time ? `${date} ${data.time}` : new Date(); // Merging date, to prevent Date(timestamp) error
        const formattedDate = formatDateTime(date);
        const formattedTime = formatDateTime(time, "time");
        
        const userId = req.user._id;

        const activityData = {
            category_id: data.categoryId || 0,
            date: formattedDate,
            time: formattedTime,
            activity: data.activity,
            description: data.description,
            number: data.number,
            start_age: data.startAge,
            end_age: data.endAge,
            skill: data.skill,
            gender: data.gender,
            owner_id: userId,
            creation_date: formatDateTime(new Date(), "datetime"),
        }
        
        const activityId = await saveActivity(activityData);
        if (isEmpty(activityId)) {
            res.sendResponse({ message: "Error creating new activity." }, 201);
            return;
        }
        activityData["activity_id"] = activityId;

        const locationObject = data.location;
        locationObject.resource_id = activityId;
        locationObject.resource_type = "activity";
        const locationId = await Location.saveLocation(locationObject);
        locationObject.location_id = locationId;

        // Send Notification to followers
        // const followers = await Connection.getFollowers(userId);
        // const messageText = NotificationType.getNotificationMessage("activity_new");

        const response = {
            message: "Activity created successfully",
            ...activityData,
            location: locationObject,
        }
        res.sendResponse(response, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

async function saveActivity(values) {
    // Remove unwanted fields
    delete values.save;

    let activity_id;

    // If activity_id is not provided, create a new activity
    if (isEmpty(values.activity_id)) {
        const activity = await Activity.create(values);
        activity_id = activity._id;
    } else {
        activity_id = values.activity_id;
        await Activity.updateOne({ _id: activity_id }, values);
    }

    return activity_id;
}

export async function edit(req, res) {
    try {
        const data = req.body;
        verifyRequiredParams(['activityId', 'categoryId',  'locationId', 'date', 'time', 'activity', 'description', 'number', 'startAge', 'endAge', 'skill', 'gender'], data, res);
        validateLocation(data.location, res);
        
        if(!isValidObjectId(data.activityId)) {
            res.sendResponse({message: "Activity not found."}, 201);
            return;
        }

        const activity = await Activity.findById(data.activityId);
        if(isEmpty(activity)) {
            res.sendResponse({message: "Activity not found."}, 201);
            return;
        }
 
        const user = req.user;
        const userId = user._id;
        if(!user.isOwner(activity.owner_id)) {
            res.sendResponse({message: "Unauthorized"}, 201)
        }

        const date = data.date || new Date();
        const time = data.time ? `${date} ${data.time}` : new Date(); // Merging date, to prevent Date(timestamp) error
        const formattedDate = formatDateTime(date);
        const formattedTime = formatDateTime(time, "time");
        
        const activityData = {
            category_id: data.categoryId || 0,
            date: formattedDate,
            time: formattedTime,
            activity: data.activity,
            description: data.description,
            number: data.number,
            start_age: data.startAge,
            end_age: data.endAge,
            skill: data.skill,
            gender: data.gender,
            owner_id: userId,
            activity_id: data.activityId,
        }
        
        const activityId = await saveActivity(activityData);
        if (isEmpty(activityId)) {
            res.sendResponse({ message: "Error updating this activity." }, 201);
            return;
        }
        activityData["activity_id"] = activityId;

        const locationObject = data.location;
        locationObject._id = data.locationId;
        locationObject.resource_type = "activity";
        await Location.saveLocation(locationObject);
        locationObject.location_id = data.locationId;

        const response = {
            message: "Activity updated successfully",
            ...activityData,
            location: locationObject,
        }
        res.sendResponse(response, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

async function saveActivityRequest(values) {
    // Remove unwanted fields
    delete values.save;

    let request_id;

    // If request_id is not provided, create a new request
    if (isEmpty(values.request_id)) {
        const request = await ActivityRequest.create(values);
        request_id = request._id;
    } else {
        request_id = values.request_id;
        await ActivityRequest.updateOne({ _id: request_id }, values);
    }

    return request_id;
}

export async function join(req, res) {
    try {
        const data = req.body;
        verifyRequiredParams(['activityId'], data, res);
    
        const activityId = data.activityId;
        const userMessage = data.userMessage?.trim() || null;
    
        if(!isValidObjectId(activityId)) {
            res.sendResponse({ message: "Activity does not exist" }, 201);
            return;
        }
    
        const activity = await Activity.findById(activityId);
        if(isEmpty(activity)) {
            res.sendResponse({ message: "Activity does not exist" }, 201);
            return;
        }
    
        const user = req.user;
        if(user.isOwner(activity.owner_id)) {
            res.sendResponse({ message: "You are the owner of this activity and cannot perform this action as a participant." }, 201);
            return;
        }
    
        const activityRequest = await ActivityRequest.getActivityRequest(activity, user._id);
        if(!isEmpty(activityRequest)) {
            res.sendResponse({ message: "You have already requested for this activity."}, 201);
            return;
        }
        
        const values = {
            activity_id: activityId,
            owner_id: activity.owner_id,
            user_id: user._id,
            user_message: userMessage,
            status: 0,
        }
        
        await saveActivityRequest(values);
        res.sendResponse({ message: "Request sent successfully" }, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function accept(req, res) {
    try {
        const data = req.body;
        verifyRequiredParams(['activityId', 'userId'], data, res);
        
        const activityId = data.activityId;
        const userId = data.userId;
        const ownerMessage = data.ownerMessage?.trim() || null;

        if(!isValidObjectId(activityId)) {
            res.sendResponse({ message: "Activity does not exist" }, 201);
            return;
        }
        if(!isValidObjectId(userId)) {
            res.sendResponse({ message: "Invalid User ID" }, 201);
            return;
        }

        const activity = await Activity.findById(activityId);
        const activityRequest = await ActivityRequest.getActivityRequest(activity, userId);
        if(isEmpty(activity) || isEmpty(activityRequest)) {
            res.sendResponse({ message: "Activity or request does not exist" }, 201);
            return;
        }

        const values = {
            activity_id: activityId,
            owner_id: activity.owner_id,
            user_id: userId,
            owner_message: ownerMessage,
            status: 1,
            request_id: activityRequest._id,
        }

        await saveActivityRequest(values);
        res.sendResponse({ message: "Request Accepted" }, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function reject(req, res) {
    try {
        const data = req.body;
        verifyRequiredParams(['activityId', 'userId'], data, res);
        
        const activityId = data.activityId;
        const userId = data.userId;
        const ownerMessage = data.ownerMessage?.trim() || null;

        if(!isValidObjectId(activityId)) {
            res.sendResponse({ message: "Activity does not exist" }, 201);
            return;
        }
        if(!isValidObjectId(userId)) {
            res.sendResponse({ message: "Invalid User ID" }, 201);
            return;
        }

        const activity = await Activity.findById(activityId);
        const activityRequest = await ActivityRequest.getActivityRequest(activity, userId);
        if(isEmpty(activity) || isEmpty(activityRequest)) {
            res.sendResponse({ message: "Activity or request does not exist" }, 201);
            return;
        }

        const user = req.user;
        if(!user.isOwner(activity.owner_id)) {
            res.sendResponse({ message: "Unauthorized" }, 201);
            return;
        }

        const values = {
            activity_id: activityId,
            owner_id: activity.owner_id,
            user_id: userId,
            owner_message: ownerMessage,
            status: 2,
            request_id: activityRequest._id,
        }

        await saveActivityRequest(values);
        res.sendResponse({ message: "Request Rejected" }, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function cancel(req, res) {
    try {
        const user = req.user;
        const data = req.body;

        verifyRequiredParams(['activityId'], data, res);

        const activityId = data.activityId;
        const ownerMessage = data.ownerMessage?.trim() || null;
        let userId = data.userId;

        if(!isValidObjectId(activityId)) {
            res.sendResponse({ message: "Activity does not exist" }, 201);
            return;
        }

        const activity = await Activity.findById(activityId);
        if (isEmpty(activity)) {
            return res.sendResponse({ message: 'Activity does not exist' }, 201);
        }

        let requestObject = null;

        if (user.isOwner(activity.owner_id)) {
            if(!isValidObjectId(userId)) {
                res.sendResponse({ message: "Invalid User ID" }, 201);
                return;
            }
            requestObject = await ActivityRequest.getActivityRequest(activity, userId);
        } else {
            userId = user._id;
            requestObject = await ActivityRequest.getActivityRequest(activity, userId);
        }

        if (isEmpty(requestObject)) {
            return res.sendResponse({ message: 'Request does not exist' }, 201);
        }

        if (!user.isOwner(activity.owner_id)) {
            await ActivityRequest.deleteOne({
                activity_id: activityId,
                user_id: requestObject.user_id,
                owner_id: requestObject.owner_id
            });
        } else {
            const values = {
                request_id: requestObject._id,
                status: 0,
                owner_message: ownerMessage,
            }
            await saveActivityRequest(values);
        }

        return res.sendResponse({ message: "Cancelled successfully" }, 200);

    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}