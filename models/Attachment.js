import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    extension: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    file_url: {
        type: String,
        required: true,
    },
    thumb_main: {
        type: String,
        required: true,
    },
    thumb_profile: {
        type: String,
        required: true,
    },
    thumb_icon: {
        type: String,
        required: true,
    },
    creation_date: {
        type: Date,
        default: Date.now,
    },
    modified_date: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("attachment", attachmentSchema);