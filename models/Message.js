import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    read: {
        type: Boolean,
        default: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("message", messageSchema);