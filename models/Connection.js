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

connectionSchema.statics.isFriend = async function(user_id, friend_id) {
    return await this.findOne({
        user_id,
        friend_id,
    });
}

connectionSchema.statics.getFollowers = async function (user_id) {
    return await this.find({ friend_id: user_id });
}

connectionSchema.statics.getFollowings = async function (user_id) {
    return await this.find({ user_id: user_id });
}

connectionSchema.statics.getFollowersCount = async function (user_id) {
    return await this.countDocuments({ friend_id: user_id });
}

connectionSchema.statics.getFollowingsCount = async function (user_id) {
    return await this.countDocuments({ user_id: user_id });
}


export default mongoose.model("connection", connectionSchema);