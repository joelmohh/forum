const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const otpTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'OTP_CODE.html'), 'utf-8');
const loginTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'NEW_LOGIN.html'), 'utf-8');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
/* 
await sendEmail(user.email, "New login to your account", "login", {
            USER_ID: user._id,
            DEVICE: normalizeUserAgent(userAgent),
            IP_ADDRESS: ip,
            LOCATION: location,
            TIME: new Date().toISOString()
        });
*/

function sendEmail(to, subject, type, content) {

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: to,
        subject: subject,
        text: content
    };

    if(type === "otp") {
        const htmlContent = otpTemplate.replace('{{OTP_CODE}}', content);
        mailOptions.html = htmlContent;
        mailOptions.text = null
    }
    if(type === "login") {
        console.log(content)
        const htmlContent = loginTemplate.replace('{{USER_ID}}', content.USER_ID)
            .replace('{{DEVICE}}', content.DEVICE)
            .replace('{{IP_ADDRESS}}', content.IP_ADDRESS)
            .replace('{{LOCATION}}', content.LOCATION)
            .replace('{{TIME}}', content.TIME);
        mailOptions.html = htmlContent;
        mailOptions.text = null;
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            return
            // console.log('Email sent:', info.response);
        }
    });
}

module.exports = { sendEmail, transporter };
