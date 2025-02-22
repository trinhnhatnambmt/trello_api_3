import express from "express";
import { StatusCodes } from "http-status-codes";
import { boardRoute } from "./boardRoute";
import { columnRoute } from "./columnRoute";
import { cardRoute } from "./cardRoute";
import { userRoute } from "./userRoute";

const Router = express.Router();

Router.get("/status", (req, res) => {
    res.status(StatusCodes.OK).json({ message: "API are ready to use!!" });
});

// Boards API
Router.use("/boards", boardRoute);
// Columns API
Router.use("/columns", columnRoute);
// Cards API
Router.use("/cards", cardRoute);
// Users API
Router.use("/users", userRoute);

export const API_v1 = Router;
