import mongoose from "mongoose";

const ageTypeSchema = new mongoose.Schema({
    agetype_id: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    }
});

export default mongoose.model("age_type", ageTypeSchema);