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
        if(!verifyRequiredParams(['categoryId', 'date', 'time', 'activity', 'description', 'number', 'startAge', 'endAge', 'skill', 'gender'], data, res)) return;
        if(!validateLocation(data.location, res)) return;
        
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
        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({
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
        if(!verifyRequiredParams(['activityId', 'categoryId',  'locationId', 'date', 'time', 'activity', 'description', 'number', 'startAge', 'endAge', 'skill', 'gender'], data, res)) return;
        if(!validateLocation(data.location, res)) return;
        
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
            return;
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
        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({
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
        if(!verifyRequiredParams(['activityId'], data, res)) return;
    
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
        return res.sendResponse({ message: "Request sent successfully" }, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function accept(req, res) {
    try {
        const data = req.body;
        if(!verifyRequiredParams(['activityId', 'userId'], data, res)) return;
        
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
        return res.sendResponse({ message: "Request Accepted" }, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function reject(req, res) {
    try {
        const data = req.body;
        if(!verifyRequiredParams(['activityId', 'userId'], data, res)) return;
        
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
        return res.sendResponse({ message: "Request Rejected" }, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function cancel(req, res) {
    try {
        const user = req.user;
        const data = req.body;

        if(!verifyRequiredParams(['activityId'], data, res)) return;

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
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function deleteActivity(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        if(!verifyRequiredParams(['activityId'], data, res)) return;
        
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

        return res.sendResponse({ message: "Deleted successfully" }, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function deleteRequest(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        if(!verifyRequiredParams(['activityId', 'userId'], data, res)) return;

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
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function requests(req, res) {
    try {
        const data = req.body;
        if(!verifyRequiredParams(['activityId'], data, res)) return;

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
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function detail(req, res) {
    try {
        const data = req.body;
        if(!verifyRequiredParams(['activityId'], data, res)) return;

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
        response.location_id = location._id;
        response.latitude = location.latitude;
        response.longitude = location.longitude;
        response.location = location.location;
        response.formatted_address = location.formatted_address;
        response.category_title = category.title || null;

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
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function userActivities(req, res) {
    try {
        const viewer = req.user;
        const data = req.body;

        const categoryId = data.categoryId || null;
        const currentDate = data.date || new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        const currentTime = data.time || new Date().toTimeString().slice(0, 8); // "HH:mm:ss"
        const nowDateTime = new Date(`${currentDate}T${currentTime}`);
        let userId = data.id || viewer._id;

        if(!isValidObjectId(userId)) {
            return res.sendResponse({ message: "User not found." }, 201);
        }
        const userObject = await User.getUserById(userId);
        if (isEmpty(userObject)) {
            return res.sendResponse({ message: "User not found." }, 201);
        }

        const userLocation = await Location.getLocation(userId, "user");
        if (isEmpty(userLocation)) {
            return res.sendResponse({ message: "User location doesn't exist" }, 201);
        }

        const query = {
           owner_id: userId,
           ...(categoryId && { category_id: categoryId }),
            $expr: {
                $gte: [
                    { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                    nowDateTime
                ]
            },
        };

        const options = { limit: data.limit || 10, page: data.page || 1 };
        
        const result = await paginate(Activity, query, options);

        const activities = [];
        for (const activity of result.items) {
            const activityObject = activity.toObject();
            activityObject.activity_id = activity._id;
            delete activityObject._id;
            delete activityObject.__v;

            const activityLocation = await Location.getLocation(activityObject.activity_id, "activity");
            if(!isEmpty(activityLocation)) {
                activityObject.location = activityLocation.location;
            }

            activityObject.owner_title = userObject.getDisplayName();
            activityObject.avatar = await getPhotoUrl(userObject.photo_id, "icon");
            activityObject.cat_avatar = activity.getCategoryImage();
            activityObject.is_owner = userObject.isOwner(activity.owner_id);
            activityObject.time = formatDateTime(`${activity.date} ${activity.time}`, "time", true);
            activityObject.date = formatDateTime(activity.date, "date", false, true);
            activityObject.date_android = formatDateTime(activity.date, "date");
            activityObject.creation_date = formatDateTime(`${activity.date} ${activity.time}`, "datetime");

            activities.push(activityObject);
        }

        const response = {};
        response.totalItemCount = result.totalItems;
        response.activities = activities;
        return res.sendResponse(response, 200);

    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function mine(req, res) {
    try {
        const user = req.user;
        const data = req.body;

        let date = data.date || new Date().toISOString().slice(0, 10);
        let time = data.time || new Date().toTimeString().slice(0, 8);
        const showCount = !isEmpty(data.showCount) ? (data.showCount == 1 ? true : false) : false;
        const activityType = data.type || null;
        const userId = user._id;

        const [followedActivities, pastActivities, currentActivities, pendingActivities, rejectedActivities] = await Promise.all([
            Activity.getFollowedPeopleActivities(userId, date, time, showCount),
            Activity.getPastActivities(userId, date, time, showCount),
            Activity.getCurrentActivities(userId, date, time, showCount),
            Activity.getPendingActivities(userId, date, time, showCount),
            Activity.getRejectedActivities(userId, date, time, showCount),
        ]);

        const [followed, past, current, pending, rejected] = await Promise.all([
            Activity.getActivitiesData(followedActivities, showCount),
            Activity.getActivitiesData(pastActivities, showCount),
            Activity.getActivitiesData(currentActivities, showCount),
            Activity.getActivitiesData(pendingActivities, showCount),
            Activity.getActivitiesData(rejectedActivities, showCount),
        ]);

        const response = {
            current,
            pending,
            rejected,
            followed,
            past,
        };

        let finalResponse = response;
        if (activityType && response.hasOwnProperty(activityType)) {
            finalResponse = { activities: Array.isArray(response[activityType]) ? response[activityType] : [response[activityType]] };
        }

        return res.sendResponse(finalResponse, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}

export async function nearbyActivities(req, res) {
    try {
        const user = req.user;
        const data = req.body;

        const categoryId = data?.categoryId;
        const date = data?.date || new Date().toISOString().slice(0, 10);
        const time = data?.time || new Date().toTimeString().slice(0, 8);
        const limit = parseInt(data?.limit) || 1000;
        const page = parseInt(data?.page) || 1;
        
        let latitude = 0;
        let longitude = 0;
        let distance = parseFloat(data?.distance);
        if (isNaN(distance)) {
            distance = isEmpty(user) ? 100000000000 : 1000;
        }
        
        const dateTime = new Date(`${date}T${time}`);

        // If user is logged in
        if (!isEmpty(user)) {
            const userLocation = await Location.getLocation(user._id);
            if (isEmpty(userLocation)) {
                return res.sendResponse({ message: "User location doesn't exist" }, 201);
            }

            latitude = parseFloat(data?.latitude) || userLocation.latitude;
            longitude = parseFloat(data?.longitude) || userLocation.longitude;
        }

        const activities = await Activity.getActivitiesByLocation(longitude, latitude, distance, dateTime, categoryId, limit, page);
        return res.sendResponse(activities, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error }, 201);
    }
};

export async function activities(req, res) {
    try {
        const viewer = req.user || null;
        const data = req.body;

        const categoryId = data?.categoryId || 0;
        const date = data?.date || new Date().toISOString().slice(0, 10);
        const time = data?.time || new Date().toTimeString().slice(0, 8);
        const dateTime = new Date(`${date}T${time}`);
        const limit = parseInt(data?.limit) || 10;
        const page = parseInt(data?.page) || 1;
        let distance = parseFloat(data?.distance);
        if (isNaN(distance)) {
            distance = isEmpty(viewer) ? 100000000000 : 1000;
        }

        let userLocation = null;
        let longitude = 0;
        let latitude = 0;
        if (!isEmpty(viewer)) {
            userLocation = await Location.getLocation(viewer._id, "user");
            if (isEmpty(userLocation)) {
                return res.sendResponse({ message: "User location doesn't exist" }, 201);
            }
            latitude = parseFloat(data?.latitude) || userLocation.latitude;
            longitude = parseFloat(data?.longitude) || userLocation.longitude;
        }

        const response = {
            activities: [],
            totalItemCount: 0, // By default
        };

        const activities = await Activity.getActivitiesByLocation(longitude, latitude, distance, dateTime, categoryId, limit, page);
        if (!isEmpty(activities)) {
            const activityDataList = await Promise.all(
                activities.map(activity => {
                    const enrichedActivity = {
                        ...activity,
                        _id: activity.activity_id
                    };
                    return new Activity(enrichedActivity).getListingData();
                })
            );
            response.activities.push(...activityDataList);
            response.totalItemCount = activityDataList.length;
        }

        const categoryItems = await Category.find({});
        const categories = [
            { category_id: 0, category_title: "All" },
            ...categoryItems.map(cat => ({
                category_id: cat.category_id,
                category_title: cat.title
            }))
        ];
        response.categories = categories;

        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({ message: 'Internal server error' }, 201);
    }
}