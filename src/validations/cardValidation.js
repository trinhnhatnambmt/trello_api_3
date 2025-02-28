/* eslint-disable no-console */
import { StatusCodes } from "http-status-codes";
import Joi from "joi";
import ApiError from "~/utils/ApiError";
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "~/utils/validators";

const createNew = async (req, res, next) => {
    const correctCondition = Joi.object({
        boardId: Joi.string()
            .required()
            .pattern(OBJECT_ID_RULE)
            .message(OBJECT_ID_RULE_MESSAGE),
        columnId: Joi.string()
            .required()
            .pattern(OBJECT_ID_RULE)
            .message(OBJECT_ID_RULE_MESSAGE),
        title: Joi.string().required().min(3).max(50).trim().strict(),
    });
    try {
        await correctCondition.validateAsync(req.body, { abortEarly: false });
        next();
    } catch (error) {
        next(
            new ApiError(
                StatusCodes.UNPROCESSABLE_ENTITY,
                new Error(error).message
            )
        );
    }
};

const update = async (req, res, next) => {
    //Lưu ý ko dùng required cho trường hợp update
    const correctCondition = Joi.object({
        title: Joi.string().min(3).max(50).trim().strict(),
        description: Joi.string().optional(),
    });
    try {
        // Chỉ định abortEarly: false để trường hợp nhiều lỗi validation thì trả về hết tất cả các lỗi
        // Đối với trường hợp update, cho phép Unknown để không cần đẩy một số field lên
        await correctCondition.validateAsync(req.body, {
            abortEarly: false,
            allowUnknown: true,
        });
        next();
    } catch (error) {
        next(
            new ApiError(
                StatusCodes.UNPROCESSABLE_ENTITY,
                new Error(error).message
            )
        );
    }
};

export const cardValidation = {
    createNew,
    update,
};
