import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    product_name: {
        type: String,
        required: true,
    },
    product_price: {
        type: String,
        required: true,
    },
    product_qty: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value'
        }
    },
});

export default mongoose.model("product", productSchema);