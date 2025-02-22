const brevo = require("@getbrevo/brevo");
import { env } from "~/config/environment";

let apiInstance = new brevo.TransactionalEmailsApi();

let apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = env.BREVO_API_KEY;
console.log("Brevo API Key:", env.BREVO_API_KEY);

const sendEmail = async (recipientEmail, customSubject, htmlContent) => {
    //Khởi tạo 1 cái sendSmtpEmail với những thông tin cần thiết
    let sendSmtpEmail = new brevo.SendSmtpEmail();

    //Tài khoản gửi mail: lưu ý địa chỉ email phải là cái email mà các bạn tạo tài khoản trên Brevo
    sendSmtpEmail.sender = {
        email: env.ADMIN_EMAIL_ADDRESS,
        name: env.ADMIN_EMAIL_NAME,
    };

    //Những tài khoản nhận mail
    //"to" phải là một Array để sau chúng ta có thể tùy biến gửi 1 email tới nhiều user tùy tính năng dự
    sendSmtpEmail.to = [{ email: recipientEmail }];

    //Tiêu đề của email:
    sendSmtpEmail.subject = customSubject;

    //Nội dung email dạng HTML
    sendSmtpEmail.htmlContent = htmlContent;

    // Gọi hành động gửi mail
    return apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const BrevoProvider = {
    sendEmail,
};
