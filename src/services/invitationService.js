/* eslint-disable no-useless-catch */
import { StatusCodes } from "http-status-codes";
import { boardModel } from "~/models/boardModel";
import { invitationModel } from "~/models/invitationModel";
import { userModel } from "~/models/userModel";
import ApiError from "~/utils/ApiError";
import { BOARD_INVITATION_STATUS, INVITATION_TYPES } from "~/utils/constants";
import { pickUser } from "~/utils/formatters";

const createNewBoardInvitation = async (reqbody, inviterId) => {
    try {
        // Người đi mời: chính là người đang request, nên chúng ta tìm theo id lấy từ token
        const inviter = await userModel.findOneById(inviterId);
        // Người được mời: Lấy theo email nhận từ phía FE
        const invitee = await userModel.findOneByEmail(reqbody.inviteeEmail);
        // Tìm luôn cái board ra để lấy data xử lý
        const board = await boardModel.findOneById(reqbody.boardId);

        // Nếu không tồn tại 1 trong 3 thì cứ thằng tay reject
        if (!invitee || !inviter || !board) {
            throw new ApiError(
                StatusCodes.NOT_FOUND,
                "Inviter, Invitee or Board not found"
            );
        }

        // Taọ  data cần thiết để lưu vào trong DB
        // Có thể thử bỏ hoặc làm sai lệnh type, boardInvitation, status để test  xem Model validate ok chưa
        const newInvitationData = {
            inviterId,
            inviteeId: invitee._id.toString(), // chuyển từ ObjectId về String vì sang model có check lại data ở hàm create
            type: INVITATION_TYPES.BOARD_INVITATION,
            boardInvitation: {
                boardId: board._id.toString(),
                status: BOARD_INVITATION_STATUS.PENDING, // Mặc định default ban đầu trạng thái là pending
            },
        };

        // Gọi sang model để lưu vào DB
        const createdInvitation =
            await invitationModel.createNewBoardInvitation(newInvitationData);
        const getInvitation = await invitationModel.findOneById(
            createdInvitation.insertId
        );

        // Ngoài thông tin của cái Board invitation mới tạo ra trả về đủ luôn Board, inviter, invitee cho FE thoải mái xử lý
        const resInvitation = {
            ...getInvitation,
            board,
            inviter: pickUser(inviter),
            invitee: pickUser(invitee),
        };
        return resInvitation;
    } catch (error) {
        throw error;
    }
};

const getInvitations = async (userId) => {
    try {
        const getInvitations = await invitationModel.findByUser(userId);

        // Vì các dữ liệu inviter, invitee và board là đang ở giá trị mảng 1 phần tử nếu lấy ra được nên chúng ta biến đổi nó về Json Object trước khi trả về cho phía FE
        const resInvitations = getInvitations.map((i) => ({
            ...i,
            inviter: i.inviter[0] || {},
            invitee: i.invitee[0] || {},
            board: i.board[0] || {},
        }));

        return resInvitations;
    } catch (error) {
        throw error;
    }
};

export const invitationService = {
    createNewBoardInvitation,
    getInvitations,
};
