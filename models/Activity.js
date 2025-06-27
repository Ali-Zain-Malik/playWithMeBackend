import mongoose from "mongoose";

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
        type: Date,
    },
    time: {
        type: Date,
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

export default mongoose.model("activities", activitySchema);