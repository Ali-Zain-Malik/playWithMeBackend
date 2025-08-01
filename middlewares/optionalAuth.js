import "dotenv/config";
import userModel from "../models/User.js";
import { getHeader, isEmpty } from "../utils/functions.js";

const optionalAuth = async (req, res, next) => {
    const apiKey = getHeader(req, "authorizuser");
    try {
        const user = await userModel.findOne({ apikey: apiKey });
        if (!isEmpty(user)) {
            req.user = user;
        }
        return next();
    } catch (error) {
        // silent
        return next();
    }
}

export default optionalAuth;