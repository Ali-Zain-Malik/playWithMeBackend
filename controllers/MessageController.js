/**
 * This controller will be used for socket implementation. Which will be allowing us for real time messaging.
 * Meanwhile, APIs related to messages are implemented in ConversationController.js
 */

const users = {};
const messageSocketHandler = (io) => {
    io.on("connection", (socket) => {
        socket.on("connected", async (userId) => {
            users[userId] = socket.id;
            await io.emit("userOnline", userId);
        });

        socket.on("sendMessage", async ({ viewer_id, receiver_id, message }, ack) => {
            const receipientSocketId = users[receiver_id];
            if (receipientSocketId) {
                ack({ success: true, message: "Message sent successfully" });
                await io.to(receipientSocketId).emit("receiveMessage", message);
            } else {
                ack({ success: true, message: "Message sent. User is offline" });
            }
        });

        socket.on("checkOnlineStatus", async (userId) => {
            const isOnline = users.hasOwnProperty(userId);
            await socket.emit("onlineStatus", { userId, isOnline });
        });

        socket.on("disconnect", async () => {
            const disconnectedUserId = Object.keys(users).find(key => users[key] === socket.id);
            if (disconnectedUserId) {
                delete users[disconnectedUserId];
                await io.emit("userOffline", disconnectedUserId);
            }
        });
    });
};

export default messageSocketHandler;