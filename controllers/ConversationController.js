import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import { isEmpty, getPhotoUrl, verifyRequiredParams, formatDateTime } from "../utils/functions.js";
import Message from "../models/Message.js";
import { isValidObjectId } from "mongoose";

export async function conversations(req, res) {
    try {
        const viewer = req.user;
        const data = req.body;

        const viewerId = viewer._id;
        const page = parseInt(data?.page, 10) || 1;
        const limit = parseInt(data?.limit, 10) || 10;

        const connects = await Conversation.getConnects(viewerId, limit, page);
        const response = { connections: [] };
        const connectsArray = new Set();

        if (!isEmpty(connects)) {
            for (const connect of connects) {
                let user_id = connect.user_id;
                const owner_id = connect.owner_id;

                // If viewer is not the owner, swap user_id
                if (!viewer.isOwner(owner_id)) {
                    user_id = owner_id;
                }

                // Skip duplicates
                if (connectsArray.has(String(user_id))) continue;
                connectsArray.add(String(user_id));

                const userObject = await User.getUserById(user_id);
                if (isEmpty(userObject)) continue;

                const photoUrl = await getPhotoUrl(userObject.photo_id, "icon");

                // Get connected activities (implement getConnectedActivities on Conversation model)
                const activities = await Conversation.getConnectedActivities(viewerId, user_id);

                response.connections.push({
                    user_id: userObject._id,
                    title: userObject.getDisplayName(),
                    photo_url: photoUrl,
                    activities: activities,
                });
            }
        }

        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({
            message: "Internal server error",
            error: error,
        },201);
    }
}

export async function send(req, res) {
    try {
        const user = req.user;
        const data = req.body;

        const receiverId = data?.receiverId;
        const message = data?.message;
        const date = new Date();
        if(!verifyRequiredParams(['receiverId', 'message'], data, res)) return;
        if(!isValidObjectId(receiverId)) {
            return res.sendResponse({ message: "Invalid Receiver Id"}, 201);
        }
        const receiver = await User.findOne({ _id: receiverId });
        if(isEmpty(receiver)) {
            return res.sendResponse({ message: "Receiver not found" }, 201);
        }

        const conversation = await Conversation.get(user._id, receiverId, null);
        if (isEmpty(conversation)) {
            return res.sendResponse({ message: "Conversation could not be found due to invalid parameters" }, 201);
        }

        const sentMessage = await Message.send(conversation._id, user._id, message, date);
        if (isEmpty(sentMessage)) {
            return res.sendResponse({ message: "Message could not be sent" }, 201);
        }

        return res.sendResponse({ message: "Message sent successfully" }, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error: error }, 201);
    }
}

export async function messages(req, res) {
    try {
        const user = req.user;
        const data = req.body;

        const conversationId = data?.conversationId;
        const receiverId = data?.receiverId;
        let conversation = null;

        if(!isEmpty(conversationId) && !isValidObjectId(conversationId)) {
            return res.sendResponse({ message: "Invalid conversation Id" }, 201);
        }
        if(!isEmpty(receiverId) && !isValidObjectId(receiverId)) {
            return res.sendResponse({ message: "Invalid receiver Id" }, 201);
        }

        if (!isEmpty(receiverId) && isEmpty(conversationId)) {
            conversation = await Conversation.findOne({
                $or: [
                    { owner_id: user._id, receiver_id: receiverId },
                    { owner_id: receiverId, receiver_id: user._id },
                ]
            });
        } else if (!isEmpty(conversationId)) {
            conversation = await Conversation.findById(conversationId);
        }

        if (isEmpty(conversation)) {
            return res.sendResponse({
                message: "No conversation found with provided parameters."
            }, 201);
        }

        const messages = await conversation.getMessages();
        await Message.markAsRead(conversation._id, user._id);

        const ownerId = conversation.owner_id;
        const receiverIdConv = conversation.receiver_id;

        let isOwner = false;
        let receiverObject = null;

        if (user.isOwner(ownerId)) {
            isOwner = true;
            receiverObject = await User.getUserById(receiverIdConv);
        } else {
            receiverObject = await User.getUserById(ownerId);
        }

        let response = {};

        if (!isEmpty(receiverObject)) {
            const receiverImage = await getPhotoUrl(receiverObject.photo_id, "icon");
            response = {
                user_avatar: receiverImage,
                user_id: receiverObject._id,
                user_name: receiverObject.getDisplayName(),
                receiver_deleted: false
            };
        } else {
            const receiverImage = `${process.env.BASE_URL}/upload/default/nophoto_user.png`;
            response = {
                user_avatar: receiverImage,
                user_id: receiverId,
                user_name: "Deleted Member",
                receiver_deleted: true
            };
        }

        response.is_owner = isOwner;
        response.conversation_id = conversation._id;
        response.messages = [];

        if (!isEmpty(messages)) {
            for (const message of messages) {
                const isViewer = message.user_id.toString() === user._id.toString();
                response.messages.push({
                    message_id: message._id,
                    body: message.body,
                    date: formatDateTime(message.date, "datetime"),
                    is_viewer: isViewer,
                });
            }
        }

        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error }, 201);
    }
}

export async function inbox(req, res) {
    try {
        const viewer = req.user;
        const viewerId = viewer._id;
        const data = req.body;

        const conversationId = data?.conversationId || null;
        const page = parseInt(data?.page, 10) || 1;
        const limit = parseInt(data?.limit || 10, 10);

        const conversations = await Conversation.getConversations(viewerId, limit, conversationId, page);

        const response = { conversations: [] };

        if (!isEmpty(conversations)) {
            for (const conversation of conversations) {
                let isOwner = false;
                const ownerId = conversation.owner_id;
                const receiverId = conversation.receiver_id;

                let receiverObject = null;

                if (viewer.isOwner(ownerId)) {
                    isOwner = true;
                    receiverObject = await User.getUserById(receiverId);
                } else {
                    receiverObject = await User.getUserById(ownerId);
                }

                let dataObj = {};

                if (!isEmpty(receiverObject)) {
                    const photoUrl = await getPhotoUrl(receiverObject.photo_id, "icon");

                    dataObj = {
                        avatar_receiver: photoUrl,
                        name_receiver: receiverObject.getDisplayName(),
                        receiver_id: receiverObject._id,
                    };
                } else {
                    const defaultPhoto = `${process.env.BASE_URL || ""}/upload/images/nophoto_user.png`;
                    dataObj = {
                        avatar_receiver: defaultPhoto,
                        name_receiver: "Deleted Member",
                        receiver_id: viewer.isOwner(ownerId) ? receiverId : ownerId,
                    };
                }

                dataObj.owner_id = ownerId;
                dataObj.is_owner = isOwner;
                dataObj.message = "";
                dataObj.date = "";

                const lastMessage = await conversation.getLastMessage();
                if (!isEmpty(lastMessage)) {
                    dataObj.message = lastMessage.body;
                    dataObj.date = formatDateTime(lastMessage.date, "datetime");
                }

                response.conversations.push(dataObj);
            }
        }

        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error }, 201);
    }
}