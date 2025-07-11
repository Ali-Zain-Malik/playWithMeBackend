import mongoose from "mongoose";

const activityRequestSchema = new mongoose.Schema({
    activity_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
        required: true,
    },
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: Number,
        default: 0,
    },
    user_message: {
        type: String,
        default: null,
    },
    owner_message: {
        type: String,
        default: null,
    },
});

activityRequestSchema.statics.getActivityRequest = async function (activity, userId) {
    return await this.findOne({
            activity_id: activity._id,
            owner_id: activity.owner_id,
            user_id: userId,
        });
}

activityRequestSchema.methods.getStatus = function () {
    switch(this.status) {
        case 0: return "pending";
        case 1: return "accepted";
        case 2: return "rejected";
        default: return "pending";
    }
}

export default mongoose.model("activity_request", activityRequestSchema);