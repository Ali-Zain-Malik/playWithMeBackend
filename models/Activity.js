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

export default mongoose.model("activity", activitySchema);