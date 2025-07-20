import crypto from "crypto";
import "dotenv/config";

import Attachment from "../models/Attachment.js";

/**
 * 
 * @param {Array} requiredFields Array of required fields
 * @param {Array} params Array of all the incoming fields
 * @param {Response} res Response Object
 * @returns Boolean. If all params are passed then returns true, else false and a response.
 */
export function verifyRequiredParams(requiredFields, params, res) {
    let errorFields = [];

    // If params is empty or not an object, treat all fields as missing
    if (!params || typeof params !== "object" || Object.keys(params).length === 0) {
        errorFields = requiredFields;
        params = []; // Show empty object if nothing provided
    } else {
        requiredFields.forEach(field => {
            if (
                !Object.prototype.hasOwnProperty.call(params, field) ||
                String(params[field]).trim().length === 0
            ) {
                errorFields.push(field);
            }
        });
    }

    if (errorFields.length > 0) {
        const message = `Required field(s) ${errorFields.join(', ')} is missing or empty`;
        res.sendResponse({
            message,
            params,
        }, 201);
        // Return false means any of param was missing or empty
        return false;
    }
    // Return true means no param was missing or empty
    return true;
}

export function getHeader(req, header) {
    if (isEmpty(header)) {
        return null;
    }

    const headerKey = header.toLowerCase();

    if (req.headers.hasOwnProperty(headerKey)) {
        return req.headers[headerKey];
    }

    for (const key in req.headers) {
        if (key.toLowerCase() === headerKey) {
            return req.headers[key];
        }
    }

    return false;
}

export function isEmpty(value) {
    return (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
    );
}


export function validateLocation(location, res) {
    if (
        typeof location !== "object" ||
        location === null ||
        isEmpty(location.latitude) ||
        isEmpty(location.longitude)
    ) {
        res.sendResponse({ message: "Not valid activity location." }, 201);
        return false;
    }
    return true;
}


export function getRandomString(length = 5) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}

export async function getPhotoUrl(photoId, type) {
    if (isEmpty(photoId)) return `${process.env.BASE_URL}/upload/default/nophoto_user.png`;

    const photo = await Attachment.findById(photoId);
    if (isEmpty(photo)) return `${process.env.BASE_URL}/upload/default/nophoto_user.png`;
    let photoUrl = null;
    switch (type) {
        case "icon":
            photoUrl = photo.thumb_icon;
            break;
        case "profile":
            photoUrl = photo.thumb_profile;
            break;
        case "main":
            photoUrl = photo.thumb_main;
            break;
        default:
            photoUrl = photo.file_url;
            break;
    }
    return `${process.env.BASE_URL}/${photoUrl}`;
}

export function formatDateTime(timestamp, type = 'date', ampm = false, humanReadable = false) {
    const dateObj = new Date(timestamp);

    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    const year = dateObj.getFullYear();

    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
    const seconds = dateObj.getSeconds().toString().padStart(2, "0");

    let formattedDate = `${year}-${month}-${day}`;
    let formattedTime = `${hours}:${minutes}:${seconds}`;

    if (humanReadable) {
        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        formattedDate = `${day} ${monthNames[dateObj.getMonth()]}, ${year}`;
    }

    if(ampm) {
        const suffix  = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        formattedTime = `${hours}:${minutes} ${suffix }`;
    }

    if(type === 'datetime') {
        return formattedDate+" "+formattedTime;
    }else if(type === 'date') {
        return formattedDate;
    }else if (type === 'time') {
        return formattedTime;
    } else {
        return formattedDate+" "+formattedTime;
    }
}

export async function paginate(model, query = {}, options = {}) {
    const page = parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const limit = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
        await model.find(query).skip(skip).limit(limit).sort({ _id: -1 }),
        await model.countDocuments(query)
    ]);

    return {
        items,
        totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit)
    };
}

export function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}