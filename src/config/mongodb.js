/* eslint-disable no-const-assign */
/* eslint-disable no-unused-vars */
//e09fXhDxqJo2B5MV

import { env } from "./environment";

const { MongoClient, ServerApiVersion } = require("mongodb");

let trelloDatabaseInstance = null;

const client = new MongoClient(env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

export const CONNECT_DB = async () => {
    await client.connect();
    trelloDatabaseInstance = client.db(env.DATABASE_NAME);
};

export const GET_DB = () => {
    if (!trelloDatabaseInstance) {
        throw new Error("Must connect to database first!!");
    }
    return trelloDatabaseInstance;
};
