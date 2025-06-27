import mongoose from "mongoose";

const blockedUserSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
});

export default mongoose.model("blocked_user", blockedUserSchema);