// Param socket sẽ được lấy từ thư viện socket.io
export const inviteUserToBoardSocket = (socket) => {
    // Lắng nghe sự kiện mà client emit lên có tên là:
    socket.on("FE_USER_INVITED_TO_BOARD", (invitation) => {
        // Cách làm nhanh và đơn giản nhất: Emit gửi ngược lại một sự kiện về cho mọi client khác (ngoại trừ chính cái thằng gửi req lên), rồi để phía FE check
        socket.broadcast.emit("BE_USER_INVITED_TO_BOARD", invitation);
    });
};
