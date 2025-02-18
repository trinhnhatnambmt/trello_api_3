/* eslint-disable no-useless-catch */
import { StatusCodes } from "http-status-codes";
import { cloneDeep } from "lodash";
import { boardModel } from "~/models/boardModel";
import { cardModel } from "~/models/cardModel";
import { columnModel } from "~/models/columnModel";
import ApiError from "~/utils/ApiError";
import { slugify } from "~/utils/formatters";

const createNew = async (reqBody) => {
    try {
        const newBoard = {
            ...reqBody,
            slug: slugify(reqBody.title),
        };

        const createdBoard = await boardModel.createNew(newBoard);

        const getNewBoard = await boardModel.findOneById(
            createdBoard.insertedId
        );
        return getNewBoard;
    } catch (error) {
        throw error;
    }
};

const getDetails = async (boardId) => {
    try {
        const board = await boardModel.getDetails(boardId);
        if (!board) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Board not found");
        }

        const resBoard = cloneDeep(board);
        resBoard.columns.forEach((column) => {
            column.cards = resBoard.cards.filter((card) =>
                card.columnId.equals(column._id)
            );
            // column.cards = resBoard.cards.filter(
            //     (card) => card.columnId.toString() === column._id.toString()
            // );
        });

        delete resBoard.cards;

        return resBoard;
    } catch (error) {
        throw error;
    }
};

const update = async (boardId, reqBody) => {
    try {
        const updateData = {
            ...reqBody,
            updatedAt: Date.now(),
        };
        const updatedBoard = await boardModel.update(boardId, updateData);

        return updatedBoard;
    } catch (error) {
        throw error;
    }
};

const moveCardToDifferentColumn = async (reqBody) => {
    try {
        // B1: Cập nhật mảng cardOrderIds của Column ban đầu chứa nó (Hiểu bản chất là xóa cái _id của Card ra khỏi mảng)
        await columnModel.update(reqBody.prevColumnId, {
            cardOderIds: reqBody.prevCardOrderIds,
            updatedAt: Date.now(),
        });
        // B2: Cập nhật mảng cardOrderIds của Column tiếp theo (Hiểu bản chất là thêm _id của Card vào mảng)
        await columnModel.update(reqBody.nextColumnId, {
            cardOderIds: reqBody.nextCardOrderIds,
            updatedAt: Date.now(),
        });
        // B3: Cập nhật lại trường columnId mới của cái Card đã kéo
        await cardModel.update(reqBody.currentCardId, {
            columnId: reqBody.nextColumnId,
        });

        return { updateResult: "Successfully" };
    } catch (error) {
        throw error;
    }
};

export const boardService = {
    createNew,
    getDetails,
    update,
    moveCardToDifferentColumn,
};
