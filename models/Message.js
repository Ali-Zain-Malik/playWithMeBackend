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

messageSchema.statics.send = async function (conversation_id, user_id, body, date = new Date()) {
    return await this.create({
        conversation_id,
        user_id,
        body,
        date,
    });
}

messageSchema.statics.markAsRead = async function (conversation_id, user_id) {
    await this.updateMany({
        conversation_id,
        user_id: { $ne: user_id },
        read: false,
    }, {
        $set: { read: true }
    });
}

export default mongoose.model("message", messageSchema);