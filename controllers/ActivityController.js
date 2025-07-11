import mongoose from "mongoose";
const { isValidObjectId } = mongoose;

import Activity from "../models/Activity.js";
import Connection from "../models/Connection.js";
import Location from "../models/Location.js";
import NotificationType from "../models/NotificationType.js";

import { verifyRequiredParams, validateLocation, formatDateTime, isEmpty, getPhotoUrl, paginate } from "../utils/functions.js";
import ActivityRequest from "../models/ActivityRequest.js";
import User from "../models/User.js";
import BlockedUser from "../models/BlockedUser.js";
import Category from "../models/Category.js";

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

export async function deleteActivity(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        verifyRequiredParams(['activityId'], data, res);
        
        const activityId = data.activityId;
        if(!isValidObjectId(activityId)) {
            res.sendResponse({ message: "Activity does not exist" } , 201);
            return;
        }

        const activity = await Activity.findById(activityId);
        if(isEmpty(activity)) {
            res.sendResponse({ message: "Activity does not exist" } , 201);
            return;
        }
        if(!user.isOwner(activity.owner_id)) {
            res.sendResponse({ message: "Unauthorized" }, 201);
            return;
        }

        await activity.deleteActivity();

        res.sendResponse({ message: "Deleted successfully" }, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function deleteRequest(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        verifyRequiredParams(['activityId', 'userId'], data, res);

        const activityId = data.activityId;
        const userId = data.userId;

        if (!isValidObjectId(activityId)) {
            res.sendResponse({ message: "Activity does not exist" }, 201);
            return;
        }
        if(!isValidObjectId(userId)) {
            res.sendResponse({ message: "Invalid User ID" }, 201);
            return;
        }

        const activity = await Activity.findById(activityId);
        const request = await ActivityRequest.getActivityRequest(activity, userId);

        if (isEmpty(activity) || isEmpty(request)) {
            res.sendResponse({ message: "Activity or request does not exist" }, 201);
            return;
        }
        if(!user.isOwner(request.owner_id)) {
            res.sendResponse({ message: "Unauthorized" }, 201);
            return;
        }

        await ActivityRequest.deleteOne({
            activity_id: activityId,
            user_id: userId,
            owner_id: user._id
        });

        return res.sendResponse({ message: "Deleted successfully" }, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function requests(req, res) {
    try {
        const data = req.body;
        verifyRequiredParams(['activityId'], data, res);

        const activityId = data.activityId;

        if (!isValidObjectId(activityId)) {
            return res.sendResponse({ message: "Activity does not exist" }, 201);
        }

        const activity = await Activity.findById(activityId);
        if (isEmpty(activity)) {
            return res.sendResponse({ message: "Activity does not exist" }, 201);
        }

        const requests = await ActivityRequest.find({ activity_id: activityId });
        const response = {
            pending: [],
            accepted: [],
            rejected: []
        };
        for (const request of requests) {
            const reqObj = request.toObject();
            reqObj.request_id = reqObj._id;
            delete reqObj._id;
            delete reqObj.__v;
            
            reqObj.activity = activity.activity;
            reqObj.activity_id = activity._id;
            reqObj.owner_id = activity.owner_id;
            reqObj.date_time = `${formatDateTime(`${activity.date} ${activity.time}`, "datetime", true, true)}`;
            reqObj.cat_avatar = activity.getCategoryImage();

            const requestUser = await User.getUserById(request.user_id);

            if(!isEmpty(requestUser)) {
                reqObj.user_avatar = await getPhotoUrl(requestUser.photo_id, "icon");
                reqObj.user_name = requestUser.getDisplayName();
            }

            const status = request.getStatus();
            response[status].push(reqObj);
        }

        return res.sendResponse(response, 200);

    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function detail(req, res) {
    try {
        const data = req.body;
        verifyRequiredParams(['activityId'], data, res);

        const activityId = data.activityId;
        const viewer = req.user;
        const viewerId = viewer ? viewer._id : null;

        if (!isValidObjectId(activityId)) {
            return res.sendResponse({ message: "Activity does not exist" }, 201);
        }

        const activity = await Activity.findById(activityId);
        if (isEmpty(activity)) {
            return res.sendResponse({ message: "Activity does not exist" }, 201);
        }
        const [location, category, owner] = await Promise.all([
            Location.getLocation(activityId, "activity"),
            Category.findOne({ category_id: activity.category_id }),
            User.getUserById(activity.owner_id),
        ]);

        const response = { ...activity.toObject() };
        response["activity_id"] = activity._id;
        delete response._id;
        delete response.__v;
        
        response.owner_title = owner.getDisplayName();
        response.avatar = await getPhotoUrl(owner.photo_id, "icon");
        response.cat_avatar = activity.getCategoryImage();
        response.is_owner = false;
        response.time = formatDateTime(`${activity.date} ${activity.time}`, "time", true);
        response.date = formatDateTime(activity.date, "date", false, true);
        response.date_android = formatDateTime(activity.date, "date");
        response.creation_date = formatDateTime(`${activity.date} ${activity.time}`, "datetime");
        response.latitude = location.latitude;
        response.longitude = location.longitude;
        response.location = location.location;
        response.formatted_address = location.formatted_address;
        response.categroy_title = category.title || null;

        let isBlocked = false;

        if (viewer) {
            isBlocked = await BlockedUser.blockStatus(viewerId, owner._id);
            response.is_blocked = isBlocked;

            if (viewer.isOwner(activity.owner_id)) {
                response.is_owner = true;
                const requests = await ActivityRequest.find({ activity_id: activityId });
                response.request_status = requests.length;
            } else {
                const requestObject = await ActivityRequest.getActivityRequest(activity, viewerId);
                if (isEmpty(requestObject)) {
                    response.request_status = 3;
                } else {
                    response.request_status = parseInt(requestObject.status, 10);
                }
            }
        }

        if (response.is_blocked) {
            response.request_status = 4;
        }

        return res.sendResponse(response, 200);

    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}