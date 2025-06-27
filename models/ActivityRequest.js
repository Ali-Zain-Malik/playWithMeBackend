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
        type: Boolean,
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

export default mongoose.model("activity_request", activityRequestSchema);