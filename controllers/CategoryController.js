import Category from "../models/Category.js";
import AgeType from "../models/AgeType.js";

export async function categories(req, res) {
    try {
        const response = {};
        response.categories = await Category.find();
        response.agetypes = await AgeType.find();
        res.sendResponse(response, 200);
    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error,
        }, 201);
    }
}