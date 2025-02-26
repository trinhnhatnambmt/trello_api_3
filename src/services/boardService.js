/* eslint-disable no-useless-catch */
import { StatusCodes } from "http-status-codes";
import { cloneDeep } from "lodash";
import { boardModel } from "~/models/boardModel";
import { cardModel } from "~/models/cardModel";
import { columnModel } from "~/models/columnModel";
import ApiError from "~/utils/ApiError";
import { DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE } from "~/utils/constants";
import { slugify } from "~/utils/formatters";

const createNew = async (userId, reqBody) => {
    try {
        const newBoard = {
            ...reqBody,
            slug: slugify(reqBody.title),
        };

        const createdBoard = await boardModel.createNew(userId, newBoard);

        const getNewBoard = await boardModel.findOneById(
            createdBoard.insertedId
        );
        return getNewBoard;
    } catch (error) {
        throw error;
    }
};

const getDetails = async (userId, boardId) => {
    try {
        const board = await boardModel.getDetails(userId, boardId);
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

const getBoards = async (userId, page, itemPerPage) => {
    try {
        // Nếu không tồn tại page hoặc  itemsPerPage từ phía FE thì phía BE sẽ cần phải luôn gán giá trị mặc định
        if (!page) page = DEFAULT_PAGE;
        if (!itemPerPage) itemPerPage = DEFAULT_ITEMS_PER_PAGE;

        const results = await boardModel.getBoards(
            userId,
            parseInt(page, 10),
            parseInt(itemPerPage, 10)
        );
        return results;
    } catch (error) {
        throw error;
    }
};

export const boardService = {
    createNew,
    getDetails,
    update,
    moveCardToDifferentColumn,
    getBoards,
};
