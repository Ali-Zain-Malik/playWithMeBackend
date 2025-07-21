import http from "http";

import app from "./app.js";
import initSocket from "./socket.js";

const PORT = process.env.PORT;
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

server.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`));