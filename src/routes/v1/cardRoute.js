import express from "express";
import { StatusCodes } from "http-status-codes";
import { cardController } from "~/controllers/cardController";
import { authMiddleware } from "~/middlewares/authMiddleware";
import { cardValidation } from "~/validations/cardValidation";

const Router = express.Router();

Router.route("/")
.post(
    authMiddleware.isAuthorized,
    cardValidation.createNew,
    cardController.createNew
);

export const cardRoute = Router;
