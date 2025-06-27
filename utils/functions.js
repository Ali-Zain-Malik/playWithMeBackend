import crypto from "crypto";
import "dotenv/config";

import Attachment from "../models/Attachment.js";

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
        return res.sendResponse({
            message,
            params,
        }, 201);
    }
    // Return false means no param was missing or empty
    return false;
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
    if (isEmpty(photoId)) return "";

    const photo = await Attachment.findById(photoId);
    if (isEmpty(photo)) return null;
    let photoUrl = null;
    switch (type) {
        case "icon":
            photoUrl = photo.thumb_icon;
        case "profile":
            photoUrl = photo.thumb_profile;
        case "main":
            photoUrl = photo.thumb_main;
        default:
            photoUrl = photo.file_url;
    }
    return `${process.env.BASE_URL}/${photoUrl}`;
}