import { StatusCodes } from "http-status-codes";
import { env } from "~/config/environment";
import { JwtProvider } from "~/providers/JwtProvider";
import ApiError from "~/utils/ApiError";

// Middleware này sẽ đảm nhiệm việc quan trọng: Xác thực cái JWT accessToken nhận được từ phía FE có hợp lệ hay không
const isAuthorized = async (req, res, next) => {
    // Lấy accessToken nằm trong request cookies phía client - withCredentials trong file authorizeAxios
    const clientAccessToken = req.cookies?.accessToken;

    // Nếu như cái clientAccessToken không tồn tại thì trả về lỗi luôn
    if (!clientAccessToken) {
        next(
            new ApiError(
                StatusCodes.UNAUTHORIZED,
                "Unauthorized (token not found)"
            )
        );
        return;
    }

    try {
        //B1 : Thực hiện giải mã token xem nó có hợp lệ hay là không
        const accessTokenDecoded = await JwtProvider.verifyToken(
            clientAccessToken,
            env.ACCESS_TOKEN_SECRET_SIGNATURE
        );
        // console.log(
        //     "🚀 ~ isAuthorized ~ accessTokenDecoded:",
        //     accessTokenDecoded
        // );

        /* B2: Quan trọng: Nếu như cái token hợp lệ, thì sẽ cần phải lưu thông tin giải mã vào cái req.
         * jwtDecoded, để sử dụng cho các tầng cần xử lí phía sau
         */
        req.jwtDecoded = accessTokenDecoded;

        // B3: Cho phép request đi tiếp
        next();
    } catch (error) {
        // console.log("🚀 ~ isAuthorized ~ error:", error);
        // Nếu cái accessToken nó bị hết hạn (expired) thì mình cần trả về một cái mà lỗi GONE - 410 cho phía FE biết để gọi api RefreshToken
        if (error?.message?.includes("jwt expired")) {
            next(new ApiError(StatusCodes.GONE, "Need to refresh token."));
            return;
        }

        // Nếu như cái accessToken nó không hợp lệ do bất cứ điều gì khác vụ hết hạn thì chúng thẳng tay trả về mã 401 cho phía FE gọi api sign_out luôn
        next(new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized "));
    }
};

export const authMiddleware = { isAuthorized };
