import Joi from "joi";
import { ObjectId } from "mongodb";
import { GET_DB } from "~/config/mongodb";
import { BOARD_INVITATION_STATUS, INVITATION_TYPES } from "~/utils/constants";
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "~/utils/validators";

const INVITATION_COLLECTION_NAME = "invitations";
const INVITATION_COLLECTION_SCHEMA = Joi.object({
    inviterId: Joi.string()
        .required()
        .pattern(OBJECT_ID_RULE)
        .message(OBJECT_ID_RULE_MESSAGE), // người đi mời
    inviteeId: Joi.string()
        .required()
        .pattern(OBJECT_ID_RULE)
        .message(OBJECT_ID_RULE_MESSAGE), // người dc mời
    type: Joi.string()
        .required()
        .valid(...Object.values(INVITATION_TYPES)),

    // Lời mời là board thì sẽ  lưu thêm dữ liệu vào boardInvitation - optional
    boardInvitation: Joi.object({
        boardId: Joi.string()
            .required()
            .pattern(OBJECT_ID_RULE)
            .message(OBJECT_ID_RULE_MESSAGE),
        status: Joi.string()
            .required()
            .valid(...Object.values(BOARD_INVITATION_STATUS)),
    }).optional(),

    createdAt: Joi.date().timestamp("javascript").default(Date.now),
    updatedAt: Joi.date().timestamp("javascript").default(null),
    _destroy: Joi.boolean().default(false),
});

// Chỉ định ra những Fields mà chúng ta không muốn cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = [
    "_id",
    "inviterId",
    "inviteeId",
    "type",
    "createdAt",
];

const validateBeforeCreate = async (data) => {
    return await INVITATION_COLLECTION_SCHEMA.validateAsync(data, {
        abortEarly: false,
    });
};

const createNewBoardInvitation = async (data) => {
    try {
        const validData = await validateBeforeCreate(data);
        // Biến đổi  một số dữ liệu liên quan tới ObjectId chuẩn chỉnh
        let newInvitationToAdd = {
            ...validData,
            inviterId: new ObjectId(validData.inviterId),
            inviteeId: new ObjectId(validData.inviteeId),
        };
        // Nếu tồn tại dữ liệu boardInvitation thì update cho cái  boardId
        if (validData.boardInvitation) {
            newInvitationToAdd.boardInvitation = {
                ...validData.boardInvitation,
                boardId: new ObjectId(validData.boardInvitation.boardId),
            };
        }
        // Gọi insert vào DB
        const createdInvitation = await GET_DB()
            .collection(INVITATION_COLLECTION_NAME)
            .insertOne(newInvitationToAdd);
        return createdInvitation;
    } catch (error) {
        throw new Error(error);
    }
};

const findOneById = async (invitationId) => {
    try {
        const result = await GET_DB()
            .collection(INVITATION_COLLECTION_NAME)
            .findOne({
                _id: new ObjectId(invitationId),
            });
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

const update = async (invitationId, updateData) => {
    try {
        // Lọc những cái field mà không cho phép cập nhật linh tinh
        Object.keys(updateData).forEach((fieldName) => {
            if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
                delete updateData[fieldName];
            }
        });

        // Đối với những dữ liệu liên quan đến ObjectId, biến đổi ở đây
        if (updateData.boardInvitation) {
            updateData.boardInvitation = {
                ...updateData.boardInvitation,
                boardId: new ObjectId(updateData.boardInvitation.boardId),
            };
        }

        const result = await GET_DB()
            .collection(INVITATION_COLLECTION_NAME)
            .findOneAndUpdate(
                {
                    _id: new ObjectId(invitationId),
                },
                {
                    $set: updateData, // cập nhật vào db
                },
                {
                    returnDocument: "after", // sẽ trả về kết quả mới sau khi cập nhật
                }
            );
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

export const invitationModel = {
    createNewBoardInvitation,
    INVITATION_COLLECTION_NAME,
    INVITATION_COLLECTION_SCHEMA,
    findOneById,
    update,
};
