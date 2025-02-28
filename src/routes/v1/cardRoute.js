import express from "express";
import { StatusCodes } from "http-status-codes";
import { cardController } from "~/controllers/cardController";
import { authMiddleware } from "~/middlewares/authMiddleware";
import { multerUploadMiddleware } from "~/middlewares/multerUpdloadMiddleware";
import { cardValidation } from "~/validations/cardValidation";

const Router = express.Router();

Router.route("/").post(
    authMiddleware.isAuthorized,
    cardValidation.createNew,
    cardController.createNew
);

Router.route("/:id").put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single("cardCover"),
    cardValidation.update,
    cardController.update
);

export const cardRoute = Router;
