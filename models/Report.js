import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    description: {
        type: String,
        default: null,
    }
});

export default mongoose.model("report", reportSchema);