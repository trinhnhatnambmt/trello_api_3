/* eslint-disable no-useless-catch */
import { userModel } from "~/models/userModel";
import ApiError from "~/utils/ApiError";
import bcryptjs from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from "uuid";
import { pickUser } from "~/utils/formatters";
import { WEBSITE_DOMAIN } from "~/utils/constants";
import { BrevoProvider } from "~/providers/BrevoProvider";
import { JwtProvider } from "~/providers/JwtProvider";
import { env } from "~/config/environment";
import { CloudinaryProvider } from "~/providers/CloudinaryProvider";

const createNew = async (reqBody) => {
    try {
        // Kiểm tra xem email đã tồn tại trong hệ thống của chúng ta hay chưa
        const existUser = await userModel.findOneByEmail(reqBody.email);
        if (existUser) {
            throw new ApiError(StatusCodes.CONFLICT, "Email already exists!");
        }
        // Tạo data để lưu vào database
        // nameFromEmail: nếu email là huy@gmail.com thì sẽ lấy được "huy"
        const nameFromEmail = reqBody.email.split("@")[0];
        const newUser = {
            email: reqBody.email,
            password: bcryptjs.hashSync(reqBody.password, 8), // Tham số thứ hai là độ phức tạp, giá trị càng cao thì băm càng lâu
            username: nameFromEmail,
            displayName: nameFromEmail, // mặc định để giống username khi user đăng ký mới, về sau làm tính năng update cho user
            verifyToken: uuidv4(),
        };
        // Thực hiện lưu thông tin user vào database
        const createdUser = await userModel.createNew(newUser);

        const getNewUser = await userModel.findOneById(createdUser.insertedId);

        // Gửi email cho người dùng xác thực tài khoản
        const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getNewUser.email}&token=${getNewUser.verifyToken}`;
        const customSubject =
            "Plese verify your email before using our services!";
        const htmlContent = `
            <h3>Here is your verification link: </h3>
            <h3>${verificationLink} </h3>
            <h3>Thank <3 </h3>
            
        `;
        // Gọi tới provider gửi mail
        await BrevoProvider.sendEmail(
            getNewUser.email,
            customSubject,
            htmlContent
        );

        // return trả lại dữ liệu cho phía controller
        return pickUser(getNewUser);
    } catch (error) {
        throw error;
    }
};

const verifyAccount = async (reqBody) => {
    try {
        //Query user trong database
        const existUser = await userModel.findOneByEmail(reqBody.email);
        //Các bước kiểm tra cần thiết
        if (!existUser)
            throw new ApiError(StatusCodes.NOT_FOUND, "Account not found");
        if (existUser.isActive) {
            throw new ApiError(
                StatusCodes.NOT_ACCEPTABLE,
                "Your account is already active!"
            );
        }
        if (reqBody.token !== existUser.verifyToken) {
            throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Account not found");
        }

        //Nếu như mọi thứ OK thì chúng ta bắt đầu update lại thông tin của thằng user để verify account
        const updateData = {
            isActive: true,
            verifyToken: null,
        };

        const updatedUser = await userModel.update(existUser._id, updateData);

        //Thực hiện update thông tin user
        return pickUser(updatedUser);
    } catch (error) {
        throw error;
    }
};

const login = async (reqBody) => {
    try {
        //Query user trong database
        const existUser = await userModel.findOneByEmail(reqBody.email);
        //Các bước kiểm tra cần thiết
        if (!existUser)
            throw new ApiError(StatusCodes.NOT_FOUND, "Account not found");
        if (!existUser.isActive) {
            throw new ApiError(
                StatusCodes.NOT_ACCEPTABLE,
                "Your account is not active!"
            );
        }
        if (!bcryptjs.compareSync(reqBody.password, existUser.password)) {
            throw new ApiError(
                StatusCodes.NOT_ACCEPTABLE,
                "Your email or password is incorrect!"
            );
        }

        /**
         *  Nếu mọi thứ OK thì bắt đầu tạo Tokens đăng nhập để trả về cho phía FE
            Tạo thông tin đính kèm trong JWT token: bao gồm _id và email của user
         */
        const userInfo = {
            _id: existUser._id,
            email: existUser.email,
        };

        // Tạo ra 2 loại token, accessToken và refreshToken để trả về cho phía FE
        const accessToken = await JwtProvider.generateToken(
            userInfo,
            env.ACCESS_TOKEN_SECRET_SIGNATURE,
            // 5
            env.ACCESS_TOKEN_LIFE
        );

        const refreshToken = await JwtProvider.generateToken(
            userInfo,
            env.REFRESH_TOKEN_SECRET_SIGNATURE,
            // 15
            env.REFRESH_TOKEN_LIFE
        );

        // Trả về thông tin của user kèm theo 2 cái token vừa tạo ra
        return {
            accessToken,
            refreshToken,
            ...pickUser(existUser),
        };
    } catch (error) {
        throw error;
    }
};

const refreshToken = async (clientRefreshToken) => {
    try {
        // Verify / giải mã cái refresh token xem có hợp lệ hay không
        const refreshTokenDecoded = await JwtProvider.verifyToken(
            clientRefreshToken,
            env.REFRESH_TOKEN_SECRET_SIGNATURE
        );

        // Đoạn này vì chúng ta chỉ lưu những thông tin unique và cố định của user trong token rồi, vì vậy có thể
        //lấy luôn từ decoded ra, tiết kiệm query vào DB để lấy data mới

        const userInfo = {
            _id: refreshTokenDecoded._id,
            email: refreshTokenDecoded.email,
        };

        // Tạo accessToken mới
        const accessToken = await JwtProvider.generateToken(
            userInfo,
            env.ACCESS_TOKEN_SECRET_SIGNATURE,
            // 5 // 5s để test token hết hạn
            env.ACCESS_TOKEN_LIFE // 1 tiếng
        );

        return { accessToken };
    } catch (error) {
        throw error;
    }
};

const update = async (userId, reqBody, userAvatarFile) => {
    try {
        // Query user và kiểm tra cho chắc chắn
        const existUser = await userModel.findOneById(userId);
        //Các bước kiểm tra cần thiết
        if (!existUser)
            throw new ApiError(StatusCodes.NOT_FOUND, "Account not found");
        if (!existUser.isActive) {
            throw new ApiError(
                StatusCodes.NOT_ACCEPTABLE,
                "Your account is not active!"
            );
        }

        // Khởi tạo kết quả updated User ban đầu là empty
        let updatedUser = {};

        // Trường hợp change password
        if (reqBody.current_password && reqBody.new_password) {
            // Kiểm tra cái Pass hiện tại coi có đúng hay không
            if (
                !bcryptjs.compareSync(
                    reqBody.current_password,
                    existUser.password
                )
            ) {
                throw new ApiError(
                    StatusCodes.NOT_ACCEPTABLE,
                    "Your current password is incorrect!"
                );
            }
            // Nếu như current password là đúng thì chúng ta sẽ hash Password mới và update lại vào DB
            updatedUser = await userModel.update(existUser._id, {
                password: bcryptjs.hashSync(reqBody.new_password, 8),
            });
        } else if (userAvatarFile) {
            // Trường hợp upload file lên Cloud Storage, cụ thể là Cloudinary
            const uploadResult = await CloudinaryProvider.streamUpload(
                userAvatarFile.buffer,
                "users"
            );
            // console.log("🚀 ~ update ~ uploadResult:", uploadResult);

            // Lưu lại URL (secure_url) của cái file ảnh vào trong DB
            updatedUser = await userModel.update(existUser._id, {
                avatar: uploadResult.secure_url,
            });
        } else {
            // Trường hợp update các thông tin chung, ví dụ như displayName
            updatedUser = await userModel.update(existUser._id, reqBody);
        }

        return pickUser(updatedUser);
    } catch (error) {
        throw error;
    }
};

export const userService = {
    createNew,
    verifyAccount,
    login,
    refreshToken,
    update,
};
