import { Server } from "socket.io";
import messageSocketHandler from "./controllers/MessageController.js";

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        }
    });

    // Pass the `io` instance to Message Controller
    messageSocketHandler(io);
};

export default initSocket;