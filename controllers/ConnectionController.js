import User from "../models/User.js";
import Connection from "../models/Connection.js";

import { isValidObjectId } from "mongoose";
import { verifyRequiredParams, isEmpty, getPhotoUrl } from "../utils/functions.js";


export async function addFriend(req, res) {
    try {
        const viewer = req.user;
        const data = req.body;
        
        const friendId = data?.friendId;
        const viewerId = viewer._id;
        verifyRequiredParams(['friendId'], data, res);

        if(!isValidObjectId(friendId)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }
        
        const friend = await User.getUserById(friendId);
        if(isEmpty(friend)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }

        const isAlreadyFriend = await Connection.isFriend(viewerId, friendId);
        if (isAlreadyFriend) {
            return res.sendResponse({ message: "Already connected" }, 201);
        }

        const friendshipId = await Connection.addFriend(viewerId, friendId);
        if (isEmpty(friendshipId)) {
            return res.sendResponse({ message: "Failed to connect. Please try again!" }, 201);
        }

        return res.sendResponse({ message: "Successfully connected" }, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error }, 201);
    }
}

export async function deleteConnection(req, res) {
        try {
        const viewer = req.user;
        const data = req.body;
        
        const friendId = data?.friendId;
        const viewerId = viewer._id;
        verifyRequiredParams(['friendId'], data, res);

        if(!isValidObjectId(friendId)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }
        
        const friend = await User.getUserById(friendId);
        if(isEmpty(friend)) {
            return res.sendResponse({ message: "User Not Found" }, 201);
        }

        const connection = await Connection.isFriend(viewerId, friendId);
        if (isEmpty(connection)) {
            return res.sendResponse({ message: "You are not connected." }, 201);
        }

        const result = await connection.unfriend(viewerId, friendId);
        if(!result.acknowledged) {
            return res.sendResponse({ message: "Failed to disconnect. Please try again!" }, 201);
        }
        return res.sendResponse({ message: "Successfully disconnected" }, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error }, 201);
    }
}

export async function followers(req, res) {
    try {
        const viewer = req.user;
        let viewerId = viewer._id;
        const userId = req.body?.id;

        if (!isEmpty(userId)) {
            viewerId = userId;
        }

        const connections = await Connection.getFollowers(viewerId);
        const response = { connections: [] };

        if (!isEmpty(connections)) {
            for (const connection of connections) {
                const follower = await User.getUserById(connection.user_id);
                if (isEmpty(follower)) continue;

                const photoUrl = await getPhotoUrl(follower.photo_id, "icon");

                response.connections.push({
                    user_id: follower._id,
                    title: follower.getDisplayName(),
                    photo_url: photoUrl,
                });
            }
        }

        response.totalItemCount = response.connections.length;

        return res.sendResponse(response, 200);
    } catch (error) {
        return res.sendResponse({ message: "Internal server error", error }, 500);
    }
}

export async function followings(req, res) {
    try {
        const viewer = req.user;
        let viewerId = viewer._id;
        const userId = req.body?.id;

        if (!isEmpty(userId)) {
            viewerId = userId;
        }

        const connections = await Connection.getFollowings(viewerId);
        const response = { connections: [] };

        if (!isEmpty(connections)) {
            for (const connection of connections) {
                const friend = await User.getUserById(connection.friend_id);
                if (isEmpty(friend)) continue;

                const photoUrl = await getPhotoUrl(friend.photo_id, "icon");

                response.connections.push({
                    user_id: friend._id,
                    title: friend.getDisplayName(),
                    photo_url: photoUrl,
                });
            }
        }

        response.totalItemCount = response.connections.length;

        return res.sendResponse(response, 200);
    } catch (error) {
        console.error(error);
        return res.sendResponse({ message: "Internal server error", error }, 500);
    }
}