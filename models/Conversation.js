import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    activity_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
        default: null,
    },
    modified: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("conversation", conversationSchema);