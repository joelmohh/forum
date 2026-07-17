const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const EMAIL_TYPES = {
    otp: { file: 'OTP_CODE.html' },
    login: { file: 'NEW_LOGIN.html' },
    security: { file: 'SECURITY_ALERT.html' }
};

const templates = {};
for (const [type, { file }] of Object.entries(EMAIL_TYPES)) {
    templates[type] = fs.readFileSync(path.join(__dirname, 'templates', file), 'utf-8');
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderTemplate(html, data) {
    return html.replace(/{{\s*([A-Z_]+)\s*}}/g, (match, key) => {
        return key in data ? escapeHtml(data[key]) : '';
    });
}

async function sendEmail(to, subject, type, data) {
    const templateConfig = EMAIL_TYPES[type];

    if (!templateConfig) {
        throw new Error(`Tipo de e-mail desconhecido: "${type}"`);
    }

    const html = renderTemplate(templates[type], data);

    const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (err) {
        console.error(`Falha ao enviar e-mail (${type}) para ${to}:`, err);
        throw err; 
    }
}

module.exports = { sendEmail, transporter };