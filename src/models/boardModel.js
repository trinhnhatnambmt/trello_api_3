import { ObjectId, ReturnDocument } from "mongodb";
import { GET_DB } from "~/config/mongodb";
import { BOARD_TYPES } from "~/utils/constants";
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "~/utils/validators";
import { columnModel } from "./columnModel";
import { cardModel } from "./cardModel";
import { pagingSkipValue } from "~/utils/algorithms";
import { userModel } from "./userModel";

const Joi = require("joi");

const BOARD_COLLECTION_NAME = "boards";
const BOARD_COLLECTION_SCHEMA = Joi.object({
    title: Joi.string().required().min(3).max(50).trim().strict(),
    slug: Joi.string().required().min(3).trim().strict(),
    description: Joi.string().required().min(3).max(256).trim().strict(),
    type: Joi.string()
        .valid(BOARD_TYPES.PUBLIC, BOARD_TYPES.PRIVATE)
        .required(),

    // Lưu ý các item trong mảng columnOrderIds là ObjectId nên cần thêm pattern cho chuẩn nhé, (lúc quay video số 57 mình quên nhưng sang đầu video số 58 sẽ có nhắc lại về cái này.)
    columnOrderIds: Joi.array()
        .items(
            Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
        )
        .default([]),
    // Những ADMIN của board
    ownerIds: Joi.array()
        .items(
            Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
        )
        .default([]),
    // Những thành viên của board
    memberIds: Joi.array()
        .items(
            Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
        )
        .default([]),

    createdAt: Joi.date().timestamp("javascript").default(Date.now),
    updatedAt: Joi.date().timestamp("javascript").default(null),
    _destroy: Joi.boolean().default(false),
});

// Chỉ định ra những Fields mà chúng ta không muốn cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = ["_id", "createdAt"];

const validateBeforeCreate = async (data) => {
    return await BOARD_COLLECTION_SCHEMA.validateAsync(data, {
        abortEarly: false,
    });
};

const createNew = async (userId, data) => {
    try {
        const validData = await validateBeforeCreate(data);

        const newBoardToAdd = {
            ...validData,
            ownerIds: [new ObjectId(userId)],
        };

        const createdBoard = await GET_DB()
            .collection(BOARD_COLLECTION_NAME)
            .insertOne(newBoardToAdd);

        return createdBoard;
    } catch (error) {
        throw new Error(error);
    }
};

const findOneById = async (id) => {
    try {
        const result = await GET_DB()
            .collection(BOARD_COLLECTION_NAME)
            .findOne({
                _id: new ObjectId(id),
            });
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

// Query tổng hợp (aggregate) để lấy toàn bộ Columns và Cards thuộc về Board
const getDetails = async (userId, boardId) => {
    try {
        const queryConditions = [
            { _id: new ObjectId(boardId) },

            { _destroy: false },

            {
                $or: [
                    {
                        ownerIds: {
                            $all: [new ObjectId(userId)],
                        },
                    },
                    {
                        memberIds: {
                            $all: [new ObjectId(userId)],
                        },
                    },
                ],
            },
        ];
        const result = await GET_DB()
            .collection(BOARD_COLLECTION_NAME)
            .aggregate([
                {
                    $match: { $and: queryConditions },
                },
                {
                    $lookup: {
                        from: columnModel.COLUMN_COLLECTION_NAME,
                        localField: "_id",
                        foreignField: "boardId",
                        as: "columns",
                    },
                },
                {
                    $lookup: {
                        from: cardModel.CARD_COLLECTION_NAME,
                        localField: "_id",
                        foreignField: "boardId",
                        as: "cards",
                    },
                },
                {
                    $lookup: {
                        from: userModel.USER_COLLECTION_NAME,
                        localField: "ownerIds",
                        foreignField: "_id",
                        as: "owners",
                        // pipeline trong lookup là để xử lí một hoặc nhiều luồng cần thiết
                        // $project để chỉ định vài field không muốn lấy về bằng cách gán nó giá trị 0
                        pipeline: [
                            { $project: { password: 0, verifyToken: 0 } },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: userModel.USER_COLLECTION_NAME,
                        localField: "memberIds",
                        foreignField: "_id",
                        as: "members",
                        pipeline: [
                            { $project: { password: 0, verifyToken: 0 } },
                        ],
                    },
                },
            ])
            .toArray();
        return result[0] || {};
    } catch (error) {
        throw new Error(error);
    }
};

const pushColumnOrderIds = async (column) => {
    try {
        const result = await GET_DB()
            .collection(BOARD_COLLECTION_NAME)
            .findOneAndUpdate(
                {
                    _id: new ObjectId(column.boardId),
                },
                {
                    $push: { columnOrderIds: new ObjectId(column._id) },
                },
                {
                    returnDocument: "after",
                }
            );
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

// Lấy một phần tử columnId ra khỏi mảng columnOrderIds
// Dùng $pull trong mongodb ở trường hợp này để lấy một phần tử ra khỏi mảng rồi xóa nó đi
const pullColumnOrderIds = async (column) => {
    try {
        const result = await GET_DB()
            .collection(BOARD_COLLECTION_NAME)
            .findOneAndUpdate(
                {
                    _id: new ObjectId(column.boardId),
                },
                {
                    $pull: { columnOrderIds: new ObjectId(column._id) },
                },
                {
                    returnDocument: "after",
                }
            );
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

const update = async (boardId, updateData) => {
    try {
        // Lọc những cái field mà không cho phép cập nhật linh tinh
        Object.keys(updateData).forEach((fieldName) => {
            if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
                delete updateData[fieldName];
            }
        });

        // Đối với những dữ liệu liên quan đến ObjectId, biến đổi ở đây
        if (updateData.columnOrderIds) {
            updateData.columnOrderIds = updateData.columnOrderIds.map(
                (_id) => new ObjectId(_id)
            );
        }

        const result = await GET_DB()
            .collection(BOARD_COLLECTION_NAME)
            .findOneAndUpdate(
                {
                    _id: new ObjectId(boardId),
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

const getBoards = async (userId, page, itemPerPage) => {
    try {
        const queryConditions = [
            // Điều kiện 1: Board chưa bị xóa
            { _destroy: false },
            // Điều kiện 2: cái thằng userId đang thực hiện request này nó phải thuộc vào một trong 2 cái mảng
            //ownerIds hoặc memberIds, sử dụng toán tử $all của mongodb
            {
                $or: [
                    {
                        ownerIds: {
                            $all: [new ObjectId(userId)],
                        },
                    },
                    {
                        memberIds: {
                            $all: [new ObjectId(userId)],
                        },
                    },
                ],
            },
        ];

        const query = await GET_DB()
            .collection(BOARD_COLLECTION_NAME)
            .aggregate(
                [
                    {
                        $match: { $and: queryConditions },
                    },
                    // $sort title của board theo A-Z (mặc định sẽ bị chữ B hoa đứng trc a thường)
                    {
                        $sort: { title: 1 },
                    },
                    // $facet Để xử lí nhiều luồng trong 1 query
                    {
                        $facet: {
                            // Luồng 1: Query boards
                            queryBoards: [
                                { $skip: pagingSkipValue(page, itemPerPage) }, // Bỏ qua số lượng bản ghi của nhửng page trc đó
                                { $limit: itemPerPage }, // Giới hạn tối đa số lượng bản ghi trả về trên 1 page
                            ],
                            // Luồng 2: Đếm tổng tất cả số lượng bản ghi boards trong DB và trả về countedAllBoards
                            queryTotalBoards: [{ $count: "countedAllBoards" }],
                        },
                    },
                ],
                // Khai báo thêm thuộc tính collation locale: "en" để fix vụ B hoa đứng trước a thường
                { collation: { locale: "en" } }
            )
            .toArray();
        // console.log("query", query);

        const res = query[0];
        return {
            boards: res.queryBoards || [],
            totalBoards: res.queryTotalBoards[0]?.countedAllBoards || 0,
        };
    } catch (error) {
        throw new Error(error);
    }
};

export const boardModel = {
    BOARD_COLLECTION_NAME,
    BOARD_COLLECTION_SCHEMA,
    createNew,
    findOneById,
    getDetails,
    pushColumnOrderIds,
    update,
    pullColumnOrderIds,
    getBoards,
};
