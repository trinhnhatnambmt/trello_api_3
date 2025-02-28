/* eslint-disable no-useless-catch */
import { cardModel } from "~/models/cardModel";
import { columnModel } from "~/models/columnModel";

const createNew = async (reqBody) => {
    try {
        const newCard = {
            ...reqBody,
        };

        const createdCard = await cardModel.createNew(newCard);

        const getNewCard = await cardModel.findOneById(createdCard.insertedId);

        if (getNewCard) {
            // Cập nhật mảng columnOrderIds trong collection boards
            await columnModel.pushCardOrderIds(getNewCard);
        }

        return getNewCard;
    } catch (error) {
        throw error;
    }
};

const update = async (cardId, reqBody) => {
    try {
        const updateData = {
            ...reqBody,
            updatedAt: Date.now(),
        };
        const updatedCard = await cardModel.update(cardId, updateData);

        return updatedCard;
    } catch (error) {
        throw error;
    }
};

export const cardService = {
    createNew,
    update,
};
