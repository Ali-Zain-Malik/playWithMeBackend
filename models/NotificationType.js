import mongoose from "mongoose";

const notificationTypeSchema = new mongoose.Schema({
    notification_id: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    }
});

notificationTypeSchema.statics.getNotificationMessage = async function (type) {
    const notification =  await this.findOne({ type });
    if(!notification) {
        return null;
    }
    return notification.message;
}

export default mongoose.model("notification_type", notificationTypeSchema);