import mongoose from "mongoose";
import { isEmpty } from "../utils/functions.js";

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

blockedUserSchema.statics.blockStatus = async function(user_id, owner_id) {
    const block = await this.findOne({
        user_id,
        owner_id,
    });

    return !isEmpty(block) ? true : false;
}

export default mongoose.model("blocked_user", blockedUserSchema);