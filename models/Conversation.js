import mongoose from "mongoose";
import { isEmpty, paginate } from "../utils/functions.js";

import Activity from "./Activity.js";
import Message from "./Message.js";

const conversationSchema = new mongoose.Schema({
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    activity_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
        default: null,
    },
    modified: {
        type: Date,
        default: Date.now,
    },
});

conversationSchema.statics.getConnects = async function(userId, limit, page) {
    const query = {
        $and: [
            { status: 1 },
            { $or: [{ owner_id: userId }, { receiver_id: userId }] }
        ]
    };
    const options = { limit, page };

    const connections = await paginate(this, query, options);
    const activityIds = connections.items?.map(c => c.activity_id).filter(id => id);

    const activities = await Activity.find({ _id: { $in: activityIds } }).select("activity");
    const activityMap = {};
    activities.forEach(a => {
        activityMap[a._id.toString()] = a.activity;
    });

    const result = connections.items?.map(c => ({
        activity_id: c.activity_id,
        owner_id: c.owner_id,
        receiver_id: c.receiver_id,
        activity: c.activity_id ? activityMap[c.activity_id.toString()] || null : null
    }));

    return result;
}

conversationSchema.statics.getConnectedActivities = async function(viewerId, userId, limit = 10, page = 1) {
    const query = {
        status: 1,
        $or: [
            { owner_id: viewerId, receiver_id: userId },
            { owner_id: userId, receiver_id: viewerId }
        ]
    };
    const options = { limit, page };

    const connections = await paginate(this, query, options);

    const activityIds = connections.items?.map(c => c.activity_id).filter(id => id);
    if (!activityIds.length) return "";

    const activities = await Activity.find({ _id: { $in: activityIds } }).select("activity");
    const activitiesArray = activities.map(a => a.activity);

    return activitiesArray.join(", ");
};

conversationSchema.statics.get = async function (ownerId, receiverId, activityId = null) {
    let conversation = await this.findOne({
        $or: [
            { owner_id: ownerId, receiver_id: receiverId},
            { owner_id: receiverId, receiver_id: ownerId},
        ]
    });
    if (isEmpty(conversation)) {
        conversation = await this.create({
            owner_id: ownerId,
            receiver_id: receiverId,
            activity_id: activityId,
            modified: new Date(),
        });
    }
    return conversation;
};

conversationSchema.methods.getMessages = async function () {
    return await Message.find({ conversation_id: this._id }).sort({ read: 1 });
}

conversationSchema.statics.getConversations = async function (userId, limit = 10, conversationId = null, page = 1) {
    const skip = (page - 1) * limit;

    const matchCondition = {
        $or: [
            { owner_id: userId },
            { receiver_id: userId }
        ]
    };

    if (!isEmpty(conversationId)) {
        matchCondition._id = conversationId;
    }

    const conversations = await this.find(matchCondition)
    .sort({ modified: -1 })
    .skip(skip)
    .limit(limit)
    const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
        const messages = await Message.find({ conversation_id: conv._id }).sort({ _id: -1 });
        conv.message_count = messages.length;
        conv.max_read = messages.length ? Math.max(...messages.map(m => m.read ? 1 : 0)) : 0;
        return conv;
    }));
    return enrichedConversations;
};


conversationSchema.methods.getLastMessage = async function () {
    return await Message.findOne({ conversation_id: this._id }).sort({ _id: -1 });
};

conversationSchema.methods.delete = async function () {
    await Promise.all([
        Message.deleteMany({ conversation_id: this._id }),
        this.deleteOne(),
    ]);
}

export default mongoose.model("conversation", conversationSchema);