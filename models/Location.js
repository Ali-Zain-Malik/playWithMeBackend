import mongoose from "mongoose";
import { isEmpty, paginate } from "../utils/functions.js";

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
    geo: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
            coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
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
        required: true,
    }
});
locationSchema.index({ geo: "2dsphere" });

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

locationSchema.statics.getLocationByCoordinates = async function(longitude, latitude, distance = 1000, resource_type = "user", limit = 10, page = 1) {
    const locations = await this.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [longitude, latitude] },
                distanceField: "distance",
                maxDistance: distance,
                query: { resource_type },
                spherical: true
            }
        },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);
    return locations;
}

export default mongoose.model("location", locationSchema);