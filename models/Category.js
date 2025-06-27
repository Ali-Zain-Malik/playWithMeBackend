import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    category_id: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    }
});

export default mongoose.model("Categories", categorySchema);