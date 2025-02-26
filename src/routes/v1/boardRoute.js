import express from "express";
import { boardController } from "~/controllers/boardController";
import { authMiddleware } from "~/middlewares/authMiddleware";
import { boardValidation } from "~/validations/boardValidation";

const Router = express.Router();

Router.route("/")
    .get(authMiddleware.isAuthorized, boardController.getBoards)
    .post(
        authMiddleware.isAuthorized,
        boardValidation.createNew,
        boardController.createNew
    );

Router.route("/:id")
    .get(authMiddleware.isAuthorized, boardController.getDetails)
    .put(
        authMiddleware.isAuthorized,
        boardValidation.update,
        boardController.update
    );

// API hỗ trợ cho việc di chuyển card giữa các column khác nhau trong một board
Router.route("/supports/moving_card").put(
    authMiddleware.isAuthorized,
    boardValidation.moveCardToDifferentColumn,
    boardController.moveCardToDifferentColumn
);
export const boardRoute = Router;
