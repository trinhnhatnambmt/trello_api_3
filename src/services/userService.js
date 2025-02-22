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
            env.ACCESS_TOKEN_LIFE
        );

        const refreshToken = await JwtProvider.generateToken(
            userInfo,
            env.REFRESH_TOKEN_SECRET_SIGNATURE,
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

export const userService = {
    createNew,
    verifyAccount,
    login,
};
