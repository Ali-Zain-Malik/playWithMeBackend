import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    push_id: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        default: "android",
    },
    status: {
        type: Boolean,
        default: 1,
    },
});

deviceSchema.statics.deviceExists = async function(user_id, token, type) {
    const device = await this.findOne({ user_id, push_id: token, type });
    return !!device;
};

// Add or update device
deviceSchema.statics.addDevice = async function(token, type = "android", user_id) {
    if (!user_id || !token) return false;

    const exists = await this.deviceExists(user_id, token, type);
    if (exists) {
        await this.updateOne(
            { user_id, push_id: token, type },
            { $set: { status: 1 } }
        );
        return;
    }

    await this.create({
        user_id,
        push_id: token,
        type,
        status: 1
    });
};

export default mongoose.model("device", deviceSchema);