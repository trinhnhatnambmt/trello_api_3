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

const app = express();

const START_SERVER = () => {
    app.use(express.json());
    app.use(cors(corsOptions));
    app.use("/v1", API_v1);
    app.use(errorHandlingMiddleware);

    app.listen(env.APP_PORT, env.APP_HOST, () => {
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
