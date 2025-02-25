import { StatusCodes } from "http-status-codes";
import multer from "multer";
import ApiError from "~/utils/ApiError";
import {
    ALLOW_COMMON_FILE_TYPES,
    LIMIT_COMMON_FILE_SIZE,
} from "~/utils/validators";

/**
 * Hầu hết những thứ bên dưới đều có trong docs của multer, chỉ là chưa tổ chức lại cho  khoa học và gọn gàng nhất có thể
 */

// Function kiểm tra loại file nào được chấp nhận
const customFileFilter = (req, file, callback) => {
    console.log("Multer file:", file);

    // Đối với thằng multer, kiểm tra kiểu file thì chúng ra dùng mimetype
    if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
        const errMessage =
            "File type is invalid. Only accept jpg, jpeg and png";
        return callback(
            new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage),
            null
        );
    }
    return callback(null, true);
};

// Khởi tạo function upload được bọc bởi thằng multer
const upload = multer({
    limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
    fileFilter: customFileFilter,
});

export const multerUploadMiddleware = {
    upload,
};
