/* eslint-disable no-useless-catch */
import { cardModel } from "~/models/cardModel";
import { columnModel } from "~/models/columnModel";
import { CloudinaryProvider } from "~/providers/CloudinaryProvider";

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

const update = async (cardId, reqBody, cardCoverFile, userInfo) => {
    try {
        const updateData = {
            ...reqBody,
            updatedAt: Date.now(),
        };

        let updatedCard = {};

        if (cardCoverFile) {
            const uploadResult = await CloudinaryProvider.streamUpload(
                cardCoverFile.buffer,
                "card-covers"
            );

            updatedCard = await cardModel.update(cardId, {
                cover: uploadResult.secure_url,
            });
        } else if (updateData.commentToAdd) {
            // Tạo dữ liệu comment để thêm vào DB cần bổ sung thêm như field cần thiết
            const commentData = {
                ...updateData.commentToAdd,
                commentedAt: Date.now,
                userId: userInfo._id,
                userEmail: userInfo.email,
            };
            updatedCard = await cardModel.unshiftNewComment(
                cardId,
                commentData
            );
        } else {
            // Các trường hợp update chung như title, description
            updatedCard = await cardModel.update(cardId, updateData);
        }

        return updatedCard;
    } catch (error) {
        throw error;
    }
};

export const cardService = {
    createNew,
    update,
};
