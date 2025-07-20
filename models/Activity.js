import "dotenv/config";

import mongoose from "mongoose";
import Location from "./Location.js";
import ActivityRequest from "./ActivityRequest.js";
import Connection from "./Connection.js";
import User from "./User.js";

import { formatDateTime, getPhotoUrl, isEmpty } from "../utils/functions.js";

const activitySchema = new mongoose.Schema({
    category_id: {
        type: Number,
        default: 0,
    },
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    date: {
        type: String,
    },
    time: {
        type: String,
    },
    activity: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    number: {
        type: String,
        default: "Any",
    },
    start_age: {
        type: String,
        default: "Any",
    },
    end_age: {
        type: String,
        default: "Any",
    },
    skill: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    creation_date: {
        type: Date,
        default: Date.now,
    },
    sponsored: {
        type: Boolean,
        default: 0,
    },
});

activitySchema.methods.deleteActivity = async function () {
    await Promise.all([
        Location.deleteOne({ resource_id: this._id, resource_type: "activity" }),
        ActivityRequest.deleteMany({ activity_id: this._id }),
        this.deleteOne(),
    ]);
}

activitySchema.methods.getCategoryImage = function () {
    return `${process.env.BASE_URL}/upload/category/${this.category_id}.png`;
}

activitySchema.statics.getFollowedPeopleActivities = async function(userId, date, time, showCount = false) {
    // Get IDs of people the user follows
    const following = await Connection.getFollowings(userId);
    const followingIds = following.map(f => f.friend_id);

    const nowDateTime = new Date(`${date}T${time}`);
    const query = {
        owner_id: { $in: followingIds },
        $expr: {
            $gte: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                nowDateTime
            ]
        }
    };

    if (showCount) {
        return await this.countDocuments(query);
    }
    return await this.find(query).sort({ _id: -1 });
};

activitySchema.statics.getPastActivities = async function(userId, date, time, showCount = false) {
    const nowDateTime = new Date(`${date}T${time}`);
    const query = {
        owner_id: userId,
        $expr: {
            $lt: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                nowDateTime
            ]
        }
    };

    if (showCount) {
       return await this.countDocuments(query);
    }
    return await this.find(query).sort({ _id: -1 });
};

activitySchema.statics.getCurrentActivities = async function(userId, date, time, showCount = false) {
    const nowDateTime = new Date(`${date}T${time}`);

    const myPresentActivities = {
        owner_id: userId,
        $expr: {
            $gte: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                nowDateTime
            ]
        }
    };

    const acceptedRequests = await ActivityRequest.find({
        user_id: userId,
        status: 1
    }).select("activity_id");

    const requestedActivityIds = acceptedRequests.map(r => r.activity_id);

    const requestedActivities = {
        _id: { $in: requestedActivityIds },
        $expr: {
            $gte: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                nowDateTime
            ]
        }
    };

    const finalQuery = {
        $or: [myPresentActivities, requestedActivities]
    };

    if (showCount) {
        return await this.countDocuments(finalQuery);
    }

    return await this.find(finalQuery).sort({ _id: -1 });
};

activitySchema.statics.getPendingActivities = async function(userId, date, time, showCount = false) {
    const nowDateTime = new Date(`${date}T${time}`);

    const pendingRequests = await ActivityRequest.find({
        user_id: userId,
        status: 0
    }).select("activity_id");

    const pendingActivityIds = pendingRequests.map(r => r.activity_id);

    if (!pendingActivityIds.length) {
        return showCount ? 0 : [];
    }

    const query = {
        _id: { $in: pendingActivityIds },
        $expr: {
            $gte: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                nowDateTime
            ]
        }
    };

    if (showCount) {
        return await this.countDocuments(query);
    }

    return await this.find(query).sort({ _id: -1 });
};

activitySchema.statics.getRejectedActivities = async function(userId, date, time, showCount = false) {
    const nowDateTime = new Date(`${date}T${time}`);

    const rejectedRequests = await ActivityRequest.find({
        user_id: userId,
        status: 2
    }).select("activity_id");

    const rejectedActivityIds = rejectedRequests.map(r => r.activity_id);
    if (!rejectedActivityIds.length) {
        return showCount ? 0 : [];
    }

    const query = {
        _id: { $in: rejectedActivityIds },
        $expr: {
            $gte: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                nowDateTime
            ]
        }
    };

    if (showCount) {
        return await this.countDocuments(query);
    }

    return await this.find(query).sort({ _id: -1 });
};

activitySchema.statics.getActivitiesData = async function(activities, showCount = false) {
    if (showCount) {
        return typeof activities === "number" ? activities : activities.length;
    }
    if (!activities || !activities.length) return [];

    return Promise.all(activities.map(async (activity) => {
        return await activity.getListingData();
    }));
};

activitySchema.methods.getListingData = async function() {
    const [location, owner, request] = await Promise.all([
        Location.getLocation(this._id, "activity"),
        User.findById(this.owner_id),
        ActivityRequest.findOne({ activity_id: this._id, owner_id: this.owner_id }).select("status -_id")
    ]);

    // Keeping this part separate, because at first owner will be fetched and then owner_title and avatar can be fetched.
    const [owner_title, owner_avatar] = await Promise.all([
        owner.getDisplayName(),
        getPhotoUrl(owner.photo_id, "icon")
    ]);


    return {
        activity: this.activity,
        activity_id: this._id,
        category_id: this.category_id,
        owner_id: this.owner_id,
        date: formatDateTime(this.date, "date", false, true),
        time: formatDateTime(`${this.date} ${this.time}`, "time", true),
        location: location?.location || null,
        cat_avatar: this.getCategoryImage(),
        description: this.description,
        owner_title: owner_title,
        avatar: owner_avatar,
        status: !isEmpty(request?.status) ? request?.status : null,
        distance: 0, // Set to default for now
    };
};

activitySchema.statics.getActivitiesByLocation = async function(longitude, latitude, distance, dateTime, categoryId, limit = 10, page = 1) {
    const locations = await Location.getLocationByCoordinates(longitude, latitude, distance, "activity", limit, page);
    const activityIds = locations.map(loc => loc.resource_id);
    const query = {
        _id: { $in: activityIds },
         $expr: {
            $gte: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                dateTime
            ]
        }
    };
    if(!isEmpty(categoryId) && categoryId != 0) {
        query.category_id = categoryId
    }
    const activities = await this.find(query);

    // create a lookup map for fast access
    const activityMap = new Map(activities.map(a => [a._id.toString(), a]));

    
    const response = [];
    for (const loc of locations) {
        const activity = activityMap.get(loc.resource_id.toString());

        if (!activity) continue;

        response.push({
            activity: activity.activity,
            activity_id: activity._id,
            category_id: activity.category_id,
            location: loc.location,
            cat_avatar: activity.getCategoryImage(),
            latitude: loc.latitude,
            longitude: loc.longitude,
            distance: loc.distance
        });
    }

    return response;
}

export default mongoose.model("activity", activitySchema);