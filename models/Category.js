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

categorySchema.statics.getCategory = async function(category_id) {
    return await this.findOne({ category_id });
}

export default mongoose.model("Categories", categorySchema);