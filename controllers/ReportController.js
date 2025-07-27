import { isValidObjectId } from "mongoose";
import { capitalizeFirstLetter, isEmpty, verifyRequiredParams } from "../utils/functions.js";

import User from "../models/User.js";
import Activity from "../models/Activity.js";
import Report from "../models/Report.js";


export async function report (req, res) {
    try {
        const data = req.body || {};
        const user = req.user;

        verifyRequiredParams(["item_id", "type"], data, res);

        const { item_id, type } = data;
        const description = data.description?.trim() || "";

        if(type != "user" && type != "activity") {
            return res.sendResponse({ message: "Invalid type" }, 201);
        }
        if(!isValidObjectId(item_id)) {
            return res.sendResponse({ message: `${capitalizeFirstLetter(type)} not found` }, 201);
        }

        if (type === "user") {
            const userObj = await User.getUserById(item_id);
            if (isEmpty(userObj)) {
                return res.sendResponse({ message: "User not found" }, 201);
            }
        } else if (type === "activity") {
            const activityObj = await Activity.findOne({ _id: item_id });
            if (isEmpty(activityObj)) {
                return res.sendResponse({ message: "Activity not found" }, 201);
            }
        }

        // Save report
        const reportData = {
            item_id,
            type,
            description,
            owner_id: user._id
        };
        const report = await Report.create(reportData);

        return res.sendResponse({
            message: `${capitalizeFirstLetter(type)} Reported Successfully`,
            reportId: report._id
        }, 200);

    } catch (error) {
        res.sendResponse({
            message: "Internal server error",
            error: error.message
        }, 201);
    }
}