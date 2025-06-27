import mongoose from "mongoose";
import { isEmpty } from "../utils/functions.js";

const locationSchema = new mongoose.Schema({
    location: {
        type: String,
        default: null,
    },
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    formatted_address: {
        type: String,
        default: null,
    },
    country: {
        type: String,
        default: null,
    },
    state: {
        type: String,
        default: null,
    }, 
    zipcode: {
        type: String,
        default: null,
    },
    city: {
        type: String,
        default: null,
    },
    address: {
        type: String,
        default: null,
    },
    zoom: {
        type: Boolean,
        default: 0,
    },
    resource_type: {
        type: String,
        default: "user",
    },
    resource_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: 0,
    }
});

// Save or update a location
locationSchema.statics.saveLocation = async function(values) {
    let locationId;
    if (isEmpty(values._id)) {
        // Create new location
        const location = await this.create(values);
        locationId = location._id;
    } else {
        // Update existing location
        locationId = values._id || values.location_id;
        await this.updateOne({ _id: locationId }, values);
    }
    return locationId;
};

// Get a location by resource_id and resource_type
locationSchema.statics.getLocation = async function(resource_id, resource_type = "user") {
    const location =  await this.findOne({
        resource_id,
        resource_type
    });
    return location;
};

export default mongoose.model("location", locationSchema);