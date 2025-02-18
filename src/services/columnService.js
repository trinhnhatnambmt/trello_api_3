/* eslint-disable no-useless-catch */
import { StatusCodes } from "http-status-codes";
import { boardModel } from "~/models/boardModel";
import { cardModel } from "~/models/cardModel";
import { columnModel } from "~/models/columnModel";
import ApiError from "~/utils/ApiError";

const createNew = async (reqBody) => {
    try {
        const newColumn = {
            ...reqBody,
        };

        const createdColumn = await columnModel.createNew(newColumn);

        const getNewColumn = await columnModel.findOneById(
            createdColumn.insertedId
        );

        if (getNewColumn) {
            getNewColumn.cards = [];

            // Cập nhật mảng columnOrderIds trong collection boards
            await boardModel.pushColumnOrderIds(getNewColumn);
        }

        return getNewColumn;
    } catch (error) {
        throw error;
    }
};

const update = async (columnId, reqBody) => {
    try {
        const updateData = {
            ...reqBody,
            updatedAt: Date.now(),
        };
        const updatedColumn = await columnModel.update(columnId, updateData);

        return updatedColumn;
    } catch (error) {
        throw error;
    }
};

const deleteItem = async (columnId) => {
    try {
        const targetColumn = await columnModel.findOneById(columnId);
        if (!targetColumn) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Column not found");
        }

        //Xóa column
        await columnModel.deleteOneById(columnId);

        //Xóa toàn bộ Cards thuộc Column trên
        await cardModel.deleteManyByColumnId(columnId);

        //Xóa columnId trong mảng columnOrderIds của cái Board chứa nó
        await boardModel.pullColumnOrderIds(targetColumn);

        return { deleteResult: "Column and its Cards deleted successfully!" };
    } catch (error) {
        throw error;
    }
};

export const columnService = {
    createNew,
    update,
    deleteItem,
};
