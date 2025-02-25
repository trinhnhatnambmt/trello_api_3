import { StatusCodes } from "http-status-codes";
import { sampleSize } from "lodash";
import ms from "ms";
import { userService } from "~/services/userService";
import ApiError from "~/utils/ApiError";

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

const logout = async (req, res, next) => {
    try {
        // Xóa cookie - đơn giản là làm ngược lại so với việc gán cookie ở hàm login
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        res.status(StatusCodes.OK).json({ loggedOut: true });
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const result = await userService.refreshToken(
            req.cookies?.refreshToken
        );
        res.cookie("accessToken", result.accessToken, {
            httpOnly: true,
            secure: true,
            sameSize: "none",
            maxAge: ms("14 days"),
        });
    } catch (error) {
        next(
            new ApiError(
                StatusCodes.FORBIDDEN,
                "Please sign in! (Error from refresh Token)"
            )
        );
    }
};

const update = async (req, res, next) => {
    try {
        const userId = req.jwtDecoded._id;
        const userAvatarFile = req.file;
        // console.log("🚀 ~ update ~ userAvatarFile:", userAvatarFile);

        const updatedUser = await userService.update(
            userId,
            req.body,
            userAvatarFile
        );
        res.status(StatusCodes.OK).json(updatedUser);
    } catch (error) {
        next(error);
    }
};

export const userController = {
    createNew,
    verifyAccount,
    login,
    logout,
    refreshToken,
    update,
};
