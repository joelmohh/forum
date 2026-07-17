const Router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const fs = require("fs");

const sendEmail = require('../modules/mail/SMTP').sendEmail;

const User = require('../models/User');
const { newSession, updateLastLogin } = require('../modules/auth/AuthManager');
const log = require("../modules/security/securityLogs");

const OTP = require('../models/Otp');
const Session = require('../models/Sessions');
const Notifications = require('../models/Notifications');

const multer = require('multer');
const { type } = require('os');
const upload = multer({ dest: "uploads/", limits: { fileSize: 20 * 1024 * 1024 } });

function hashOtp(otp) {
    return crypto
        .createHash('sha256')
        .update(otp + process.env.JWT_SECRET)
        .digest('hex');
}


Router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    try {

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        if (!user.verified) {
            const otp = crypto.randomInt(100000, 999999).toString();
            const otpHash = hashOtp(otp);

            await OTP.findOneAndUpdate(
                { email: user.email },
                { code: otpHash, expiresAt: new Date(Date.now() + 15 * 60 * 1000), attempts: 0 },
                { upsert: true }
            );

            await sendEmail(user.email, "Your verification code", "otp", { OTP_CODE: otp });

            return res.status(403).json({
                message: "Email not verified. We've sent you a new code.",
                ok: false,
                verified: false,
                email: user.email
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials."
            });
        }

        const ip = req.ip;
        const userAgent = req.headers["user-agent"];
        const deviceId = req.body.deviceId || crypto.randomUUID();
        const refreshToken = await newSession(user, { deviceId, ip, userAgent });
        const accessToken = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

        const location = await fetch(`http://ip-api.com/json/${ip}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    return `${data.city}, ${data.regionName}, ${data.country}`;
                } else {
                    return "Unknown";
                }
            })
            .catch(() => "Unknown");

        function normalizeUserAgent(ua) {
            if (/mobile/i.test(ua)) {
                return "Mobile Device";
            } else if (/like Mac OS X/.test(ua)) {
                return "iOS Device";
            } else if (/Android/.test(ua)) {
                return "Android Device";
            } else if (/Windows NT/.test(ua)) {
                return "Windows PC";
            } else if (/Macintosh/.test(ua)) {
                return "Mac";
            } else if (/Linux/.test(ua)) {
                return "Linux PC";
            } else {
                return "Unknown Device";
            }
        }

        await updateLastLogin(user._id);

        Notifications.create({
            user: user._id,
            type: "login",
            content: `New login from ${normalizeUserAgent(userAgent)} at ${location} (${ip})`,
            link: `/users/${user.username}/settings`
        });
        await log(user._id, "login", req);

        await sendEmail(user.email, "New login to your account", "login", {
            USER_ID: user._id,
            DEVICE: normalizeUserAgent(userAgent),
            IP_ADDRESS: ip,
            LOCATION: location,
            TIME: new Date().toDateString() + " " + new Date().toLocaleTimeString()
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return res.json({ accessToken });

    } catch (err) {

        console.error(err);

        return res.status(500).json({ message: "Internal server error." });
    }
});


Router.post('/check-availability', async (req, res) => {
    const onlyUsername = req.query.username === 'true';
    const { username, email } = req.body;

    try {
        if (onlyUsername) {
            if (!username) {
                return res.status(400).json({
                    message: 'Username is required.',
                    usernameAvailable: false
                });
            }

            const usernameExists = await User.findOne({ username });

            if (usernameExists) {
                return res.json({
                    message: 'Username already exists.',
                    usernameAvailable: false
                });
            }

            return res.json({
                message: 'Username is available.',
                usernameAvailable: true
            });
        }

        if (!username || !email) {
            return res.status(400).json({
                message: 'Username and email are required.',
                usernameAvailable: false,
                emailAvailable: false
            });
        }

        const usernameExists = await User.findOne({ username });
        const emailExists = await User.findOne({ email });

        const response = {
            usernameAvailable: !usernameExists,
            emailAvailable: !emailExists,
        };

        if (!response.usernameAvailable && !response.emailAvailable) {
            return res.json({
                message: 'Username and email already exist.',
                ...response
            });
        }

        if (!response.usernameAvailable) {
            return res.json({
                message: 'Username already exists.',
                ...response
            });
        }

        if (!response.emailAvailable) {
            return res.json({
                message: 'Email already exists.',
                ...response
            });
        }

        return res.json({
            message: 'Username and email are available.',
            ...response
        });

    } catch (err) {
        console.error('Error checking availability:', err);
        return res.status(500).json({
            message: 'Internal server error.'
        });
    }
});

Router.post("/register", upload.single("profilePicture"), async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        const displayName = req.body.displayName || username;
        const bio = req.body.bio || "";

        if (username && (username.length < 3 || username.length > 30)) {
            return res.status(400).json({
                message: "Username must be between 3 and 30 characters"
            });
        }
        if (username == null || !/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                message: "Username can only contain letters, numbers and underscores"
            });
        }
        if (password && password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        let profilePicture

        const formData = new FormData();
        if (req.file && req.file.path) {
            const file = new Blob([
                await fs.promises.readFile(req.file.path)
            ]);
            formData.append("file", file, `profile_${username}_${Date.now()}.${req.file.originalname.split('.').pop()}`);

            const rule = req.file.originalname.split('.').pop()
            if (!["jpg", "jpeg", "png", "gif", "webp"].includes(rule.toLowerCase())) {
                await fs.promises.unlink(req.file.path);
                profilePicture = "https://user-cdn.hackclub-assets.com/019ed71d-3a74-701f-96af-d8cde51fa768/profile_joelmo_1781725476683.png";
            } else {

                const response = await fetch("https://cdn.hackclub.com/api/v4/upload", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.HC_CDN}`
                    },
                    body: formData
                });
                const result = await response.json();
                profilePicture = result.url;
                if (response.url === undefined || response.url === null) {
                    profilePicture = "https://user-cdn.hackclub-assets.com/019ed71d-3a74-701f-96af-d8cde51fa768/profile_joelmo_1781725476683.png";
                }
                await fs.promises.unlink(req.file.path);
            }
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({
            $or: [{ email: normalizedEmail }, { username }]
        });

        if (existingUser) {
            return res.status(200).json({
                message: "If the email is valid, we will send a code", ok: true
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const otp = crypto.randomInt(100000, 999999).toString();
        const SALT = process.env.JWT_SECRET;

        const otpHash = hashOtp(otp);

        const user = await User.create({
            username,
            displayName,
            email: normalizedEmail,
            password: passwordHash,
            profilePicture: profilePicture || "https://user-cdn.hackclub-assets.com/019ed71d-3a74-701f-96af-d8cde51fa768/profile_joelmo_1781725476683.png",
            bio,
            verified: false
        });
        await OTP.create({
            email: normalizedEmail,
            code: otpHash,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        await sendEmail(user.email, "Your verification code", "otp", { OTP_CODE: otp });

        return res.status(200).json({
            message: "If the email is valid, we sent a code",
            ok: true
        });

    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
})

Router.post("/verify-otp", async (req, res) => {
    try {
        const verificationType = req.query.type === "reset-password" ? "reset-password" : "register";
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                message: "Missing fields"
            });
        }

        const otp = await OTP.findOne({ email });

        if (!otp) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }


        if (otp.expiresAt.getTime() < Date.now()) {
            await OTP.deleteOne({ _id: otp._id });

            return res.status(400).json({
                message: "Code expired"
            });
        }


        const codeHash = hashOtp(code);

        if (codeHash !== otp.code) {
            if (otp.attempts >= 5) {
                await OTP.deleteOne({ _id: otp._id });

                return res.status(400).json({
                    message: "Too many attempts, please request a new code"
                });
            }

            otp.attempts += 1;
            await otp.save();

            return res.status(400).json({
                message: "Invalid code"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            await OTP.deleteOne({ _id: otp._id });

            return res.status(400).json({
                message: "User not found"
            });
        }

        await OTP.deleteOne({ _id: otp._id });

        if (verificationType === "reset-password") {
            const resetToken = jwt.sign(
                { sub: user._id, purpose: "reset-password" },
                process.env.JWT_SECRET,
                { expiresIn: "15m" }
            );

            return res.status(200).json({
                message: "OTP verified",
                resetToken,
                valid: true
            });
        }

        await User.updateOne({ email }, { verified: true });

        const ip = req.ip;
        const userAgent = req.headers["user-agent"];
        const deviceId = crypto.randomUUID();
        const refreshToken = await newSession(user, { deviceId, ip, userAgent });
        const accessToken = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

        await updateLastLogin(user._id);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json({
            message: "Account created successfully",
            userId: user._id,
            valid: true
        });

    } catch (err) {
        console.error("Verify error:", err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

Router.post("/resend-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(200).json({
                message: "If the email is valid, we will send a code", ok: true
            });
        }

        if (user.verified) {
            return res.status(400).json({
                message: "Email already verified"
            });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = hashOtp(otp);

        await OTP.findOneAndUpdate(
            { email: normalizedEmail },
            { code: otpHash, expiresAt: new Date(Date.now() + 15 * 60 * 1000), attempts: 0 },
            { upsert: true }
        );

        await sendEmail(normalizedEmail, "Your verification code", "otp", { OTP_CODE: otp });

        return res.status(200).json({
            message: "If the email is valid, we sent a code"
        });

    } catch (err) {
        console.error("Resend OTP error:", err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

Router.post("/refresh", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token provided." });
        }

        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const session = await Session.findOne({ tokenHash }).populate("user");

        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ message: "Invalid or expired refresh token." });
        }

        if (session.isRevoked) {
            return res.status(401).json({ message: "Session revoked" });
        }

        const accessToken = jwt.sign(
            { sub: session.user._id },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const newRefreshToken = crypto.randomBytes(64).toString("hex");

        const newTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

        session.tokenHash = newTokenHash;
        session.lastUsedAt = new Date();
        session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await session.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return res.json({ accessToken });

    } catch (err) {
        console.error("Refresh error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
});

Router.get("/logout", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
            await Session.updateOne({ tokenHash }, { isRevoked: true, revokedAt: new Date() });
            res.clearCookie("refreshToken");
        }
        return res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" }).redirect("/");

    } catch (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});


module.exports = Router;