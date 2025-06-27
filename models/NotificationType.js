import mongoose from "mongoose";

const notificationTypeSchema = new mongoose.Schema({
    notification_id: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    }
});

export default mongoose.model("notification_type", notificationTypeSchema);