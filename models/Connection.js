import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    friend_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: Boolean,
        default: 1,
    },
});

export default mongoose.model("connection", connectionSchema);