import mongoose from "mongoose";
import Location from "./Location.js";
import Category from "./Category.js";
import Activity from "./Activity.js";
import Attachment from "./Attachment.js";
import Conversation from "./Conversation.js";
import Connection from "./Connection.js";

import { getPhotoUrl, isEmpty } from "../utils/functions.js";

import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        default: null,
    },
    level_id: {
        type: Number,
        default: 4,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    gender: {
        type: String,
        default: null,
    },
    password: {
        type: String,
        required: true,
    },
    verified: {
        type: Boolean,
        default: 1,
    },
    enabled: {
        type: Boolean,
        default: 1,
    },
    encrypt: {
        type: String,
        required: true,
    },
    activation_code: {
        type: String,
    },
    apikey: {
        type: String,
    },
    about_me: {
        type: String,
        default: null,
    },
    age: {
        type: String,
        default: null,
    },
    photo_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Attachment",
        default: null,
    },
    social_user_id: {
        type: String,
        default: 0,
    },
    social_type: {
        type: String,
        default: null,
    },
    category_id: {
        type: Number,
        default: 0,
    },
    last_login_date: {
        type: Date,
    },
    creation_date: {
        type: Date,
        default: Date.now,
    },
    modified_date: {
        type: Date,
        default: Date.now,
    }
});

userSchema.statics.getUserByEmail = async function(email) {
    return await this.findOne({ email });
};

userSchema.statics.getUserById = async function(userId) {
    return await this.findById(userId);
}

userSchema.methods.getUserData = async function() {
    const data = {
        email: this.email,
        name: this.getDisplayName(),
        user_id: this._id,
        apikey: this.apikey,
        gender: this.gender,
        age: this.age,
        about_me: this.about_me,
        thumb_icon: await getPhotoUrl(this.photo_id, "icon"),
        thumb_profile: await getPhotoUrl(this.photo_id, "profile"),
        location: "",
        category_name: "",
        category_id: this.category_id,
        level_id: this.level_id,
    };

    const locationObject = await Location.getLocation(this._id, "user");
    if (locationObject && locationObject.location) {
        data.location = locationObject.location;
    }

    const categoryObject = await Category.findOne({ category_id: this.category_id });
    if (categoryObject && categoryObject.title) {
        data.category_name = categoryObject.title;
    }

    return data;
};

userSchema.methods.getDisplayName = function (name) {
    let displayName = name || this;

    if (typeof displayName === "string") {
        return displayName;
    }

    if (typeof displayName === "object" && displayName !== null) {
        if (displayName.first_name && displayName.last_name) {
            return `${displayName.first_name} ${displayName.last_name}`;
        } else if (displayName.full_name) {
            return displayName.full_name;
        } else if (displayName.first_name) {
            return displayName.first_name;
        } else if (displayName.last_name) {
            return displayName.last_name;
        } else if (displayName.username) {
            return displayName.username;
        }
    }

    return "";
};

userSchema.methods.isPasswordValid = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.isOwner = function(ownerId) {
    if(isEmpty(ownerId) || isEmpty(this._id)) {
        return false;
    }

    return this._id.toString() === ownerId.toString()
}

userSchema.methods.getActivitiesCount = async function(dateTime, categoryId = 0 ) {
    const query = {
        owner_id: this._id,
        $expr: {
            $gte: [
                { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                dateTime
            ]
        }
    };

    if(!isEmpty(categoryId) && categoryId != 0) {
        query.category_id = categoryId;
    }

    return await Activity.countDocuments(query);
}

userSchema.methods.delete = async function() {

    const [userActivities, userConversations] = await Promise.all([
        Activity.find({ owner_id: this._id }),
        Conversation.find({ 
            $or: [
                { owner_id: this._id },
                { receiver_id: this._id }
            ]
        }),
    ]);

    await Promise.all([
        ...userActivities.map(activity => activity.deleteActivity()),
        ...userConversations.map(conversation => conversation.delete()),
        Location.deleteOne({ resource_id: this._id, resource_type: "user" }),
        Attachment.deleteMany({ owner_id: this._id }),
        Connection.deleteMany({ 
            $or: [
                { user_id: this._id },
                { friend_id: this._id }
            ]
        }),
        this.deleteOne(),
    ]);
}

export default mongoose.model("user", userSchema);