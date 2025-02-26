import { boardService } from "~/services/boardService";

const { StatusCodes } = require("http-status-codes");

const createNew = async (req, res, next) => {
    try {
        const userId = req.jwtDecoded._id;
        const createdBoard = await boardService.createNew(userId, req.body);

        res.status(StatusCodes.CREATED).json(createdBoard);
    } catch (error) {
        next(error);
    }
};

const getDetails = async (req, res, next) => {
    try {
        const userId = req.jwtDecoded._id;
        const boardId = req.params.id;
        const board = await boardService.getDetails(userId, boardId);

        res.status(StatusCodes.OK).json(board);
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const boardId = req.params.id;
        const updatedBoard = await boardService.update(boardId, req.body);

        res.status(StatusCodes.OK).json(updatedBoard);
    } catch (error) {
        next(error);
    }
};

const moveCardToDifferentColumn = async (req, res, next) => {
    try {
        const result = await boardService.moveCardToDifferentColumn(req.body);

        res.status(StatusCodes.OK).json(result);
    } catch (error) {
        next(error);
    }
};

const getBoards = async (req, res, next) => {
    try {
        const userId = req.jwtDecoded._id;
        // page và itemsPerPage được truyền vào trong query url từ phía FE  nên BE sẽ lấy thông qua req.query
        const { page, itemPerPage } = req.query;
        const results = await boardService.getBoards(userId, page, itemPerPage);
        res.status(StatusCodes.OK).json(results);
    } catch (error) {
        next(error);
    }
};

export const boardController = {
    createNew,
    getDetails,
    update,
    moveCardToDifferentColumn,
    getBoards,
};
