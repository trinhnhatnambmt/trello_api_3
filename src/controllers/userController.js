import { StatusCodes } from "http-status-codes";
import ms from "ms";
import { userService } from "~/services/userService";

const createNew = async (req, res, next) => {
    try {
        const createdUser = await userService.createNew(req.body);

        res.status(StatusCodes.CREATED).json(createdUser);
    } catch (error) {
        next(error);
    }
};

const verifyAccount = async (req, res, next) => {
    try {
        const result = await userService.verifyAccount(req.body);
        res.status(StatusCodes.OK).json(result);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const result = await userService.login(req.body);

        /**
         *  Xử lí trả về http only cookie cho phía trình duyệt
         *  Về cái maxAge và thư viện ms
         *  Đối với cái  maxAge - thời gian sống của Cookie thì chúng ta để tối đa 14 ngày, tùy dự án. Lưu ý
         *  thời gian sống của cookie khấc với cái thời gian sống của token. Đừng bị nhầm lẫn
         * */
        res.cookie("accessToken", result.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: ms("14 days"),
        });

        res.cookie("refreshToken", result.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: ms("14 days"),
        });

        res.status(StatusCodes.OK).json(result);
    } catch (error) {
        next(error);
    }
};

export const userController = {
    createNew,
    verifyAccount,
    login,
};
