import "dotenv/config";
import userModel from "../models/User.js";
import { getHeader } from "../utils/functions.js";

const auth = async (req, res, next) => {
    const apiKey = getHeader(req, "authorizuser");
    let response = {  
        message: "Please login to perform this action.",
        header: apiKey, 
    };
    if (!apiKey) {
        res.sendResponse(response, 201);
        return;
    }

    try {
        const user = await userModel.findOne({ apikey: apiKey });
        if (!user) {
            res.sendResponse(response, 201);
        }
        req.user = user;
        return next();
    } catch (error) {
        response = {
            ...response,
            error: error || "Server Error",
        }
        res.sendResponse(response, 500);
    }
}

export default auth;