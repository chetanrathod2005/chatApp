
import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { connectDB } from "./DB/index.js";
import app from "./app.js";
import { initSocket } from "./socket/socket.js";

const PORT = process.env.PORT || 8000;

const httpServer = createServer(app);
initSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
