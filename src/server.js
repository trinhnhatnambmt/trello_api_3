/* eslint-disable no-console */
/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import express from "express";
import { CONNECT_DB } from "./config/mongodb";
import { env } from "./config/environment";
import { API_v1 } from "./routes/v1";
import { errorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import cors from "cors";
import { corsOptions } from "./config/cors";
import cookieParser from "cookie-parser";

//https://socket.io/get-started/chat/#integrating-socketio
import http from "http";
import socketIo from "socket.io";

const START_SERVER = () => {
    const app = express();

    // Fix cái vụ Cache from disk của ExpressJS
    app.use((req, res, next) => {
        res.set("Cache-Control", "no-store");
        next();
    });

    // Cấu hình Cookie parser
    app.use(cookieParser());

    // Enable req.body json data
    app.use(express.json());

    // Xử lí CORS
    app.use(cors(corsOptions));

    // User APIs V1
    app.use("/v1", API_v1);

    // Middleware xử lí lỗi tập trung
    app.use(errorHandlingMiddleware);

    // Tạo một cái server mới bọc thằng app của express để làm real-time với socket.io
    const server = http.createServer(app);
    // Khởi tạo biến io với server và cors
    const io = socketIo(server, { cors: corsOptions });
    io.on("connection", (socket) => {
        // Lắng nghe sự kiện mà client emit lên có tên là:
        socket.on("FE_USER_INVITED_TO_BOARD", (invitation) => {
            // Cách làm nhanh và đơn giản nhất: Emit gửi ngược lại một sự kiện về cho mọi client khác (ngoại trừ chính cái thằng gửi req lên), rồi để phía FE check
            socket.broadcast.emit("BE_USER_INVITED_TO_BOARD", invitation);
        });
    });

    server.listen(env.APP_PORT, env.APP_HOST, () => {
        // eslint-disable-next-line no-console
        console.log(
            `Hello Trinh Huy, I am running at ${env.APP_HOST}:${env.APP_PORT}`
        );
    });
};

console.log("1.Connecting to database");
CONNECT_DB()
    .then(console.log("2.Connected to Database"))
    .then(START_SERVER())
    .catch((error) => {
        console.error(error);
        process.exit(0);
    });
