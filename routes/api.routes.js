const Router = require('express').Router();
const fs = require('fs');
const sharp = require("sharp");
const bcrypt = require("bcrypt");

const multer = require("multer")
const upload = multer({ dest: 'uploads/' });

const dbUser = require('../models/User');
const Session = require('../models/Sessions');

const { verifyToken } = require('../modules/auth/AuthManager');
const { loadUser } = require('../modules/auth/loadUser');
const User = require('../models/User');
const Question = require('../models/Question');
const Notifications = require('../models/Notifications');
const { sendEmail } = require('../modules/mail/SMTP');
const log = require("../modules/security/securityLogs");

Router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized", ok: false });
        }
        res.json({ user: { id: user._id, email: user.email, username: user.username, name: user.displayName, profilePicture: user.profilePicture, bio: user.bio }, ok: true });
    } catch (err) {
        console.error("Error in /me route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post("/me/update", verifyToken, upload.fields([{ name: "profilePicture", maxCount: 1 }, { name: "banner", maxCount: 1 }]), async (req, res) => {
    try {

        const user = res.locals.user;

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized",
                ok: false
            });
        }

        const User = await dbUser.findById(user._id).select("+password");

        if (!User) {
            return res.status(404).json({
                message: "User not found",
                ok: false
            });
        }

        const { bio, displayName, bannerColor, removeProfilePicture, removeBanner, oldPassword, newPassword } = req.body;

        const username = User.username;
        const profilePicture = req.files?.profilePicture?.[0];
        const banner = req.files?.banner?.[0];
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];
        const MAX_SIZE = 5 * 1024 * 1024;
        let updatedProfilePicture = null;
        let updatedBanner = null;

        if (profilePicture) {
            if (!allowedMimeTypes.includes(profilePicture.mimetype)) {
                return res.status(400).json({
                    message: "Invalid profile picture.",
                    ok: false
                });
            }

            if (profilePicture.size > MAX_SIZE) {
                return res.status(400).json({
                    message: "Profile picture too large.",
                    ok: false
                });
            }

            const originalBuffer = await fs.promises.readFile(profilePicture.path);
            let processedBuffer;

            try {
                processedBuffer = await sharp(originalBuffer).rotate().resize({ width: 512, height: 512, fit: "cover" }).webp({ quality: 85 }).toBuffer();
            } catch {
                return res.status(400).json({
                    message: "Invalid profile picture.",
                    ok: false
                });

            }
            const formData = new FormData();
            formData.append(
                "file",
                new Blob([processedBuffer], {
                    type: "image/webp"
                }),
                `profile_${username}_${Date.now()}.webp`
            );
            const response = await fetch(
                "https://cdn.hackclub.com/api/v4/upload",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.HC_CDN}`
                    },
                    body: formData
                }
            );
            const result = await response.json();
            if (!response.ok || !result.url) {
                return res.status(500).json({
                    message: "Failed to upload profile picture.",
                    ok: false
                });
            }
            updatedProfilePicture = result.url;
        }
        if (oldPassword || newPassword) {

            if (!oldPassword || !newPassword) {
                return res.status(400).json({ message: "Please provide both the current and new password.", ok: false });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ message: "The new password must be at least 8 characters long.", ok: false });
            }

            const passwordMatches = await bcrypt.compare(oldPassword, User.password);

            if (!passwordMatches) {
                return res.status(401).json({ message: "Incorrect current password.", ok: false });
            }

            const salt = await bcrypt.genSalt(10);
            User.password = await bcrypt.hash(newPassword, salt);

            await Notifications.create({
                user: User._id,
                type: "security",
                content: "Your password has been changed. See activity log for more details.",
                link: `/users/${User._id}/settings#activity`
            });

            await log(User._id, "password_change", req);
            await Session.updateMany({ user: User._id }, { isRevoked: true });

            try {
                await sendEmail(User.email, "Password Changed", "security", {
                    USER_ID: User._id,
                    DEVICE: req.headers['user-agent'] || "Unknown",
                    IP_ADDRESS: req.ip || "Unknown",
                    LOCATION: "Unknown",
                    TIME: new Date().toISOString(),
                    ACTION: "Reset Password",
                    ABOUT: "Your password has been changed. If you did not perform this action, please review your account activity and consider changing your password immediately."
                });
            } catch (emailErr) {
                console.error("[ERROR] Error sending security alert email:", emailErr);
            }
        }
        if (banner) {

            if (!allowedMimeTypes.includes(banner.mimetype)) {
                return res.status(400).json({
                    message: "Invalid banner.",
                    ok: false
                });
            }

            if (banner.size > MAX_SIZE) {
                return res.status(400).json({
                    message: "Banner too large.",
                    ok: false
                });
            }

            const originalBuffer = await fs.promises.readFile(banner.path);
            let processedBuffer;

            try {
                processedBuffer = await sharp(originalBuffer).rotate().resize({ width: 1500, height: 500, fit: "cover" }).webp({ quality: 85 }).toBuffer();
            } catch {
                return res.status(400).json({
                    message: "Invalid banner.",
                    ok: false
                });
            }

            const formData = new FormData();

            formData.append(
                "file",
                new Blob([processedBuffer], {
                    type: "image/webp"
                }),
                `banner_${username}_${Date.now()}.webp`
            );

            const response = await fetch(
                "https://cdn.hackclub.com/api/v4/upload",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.HC_CDN}`
                    },
                    body: formData
                }
            );

            const result = await response.json();

            if (!response.ok || !result.url) {
                return res.status(500).json({
                    message: "Failed to upload banner.",
                    ok: false
                });
            }

            updatedBanner = result.url;
        }

        let profileUpdated = false;

        if (displayName !== undefined && displayName.trim() !== User.displayName) {
            User.displayName = displayName.trim();
            profileUpdated = true;
        }

        if (bio !== undefined && bio !== User.bio) {
            User.bio = bio;
            profileUpdated = true;
        }

        if (bannerColor !== undefined && bannerColor !== User.bannerColor) {
            User.bannerColor = bannerColor;
            profileUpdated = true;
        }

        if (updatedProfilePicture) {
            User.profilePicture = updatedProfilePicture;
            profileUpdated = true;
        }

        if (updatedBanner) {
            User.banner = updatedBanner;
            profileUpdated = true;
        }

        if (removeProfilePicture === "true") {
            User.profilePicture = null;
            profileUpdated = true;
        }

        if (removeBanner === "true") {
            User.banner = null;
            profileUpdated = true;
        }

        if (profileUpdated) {
            await log(User._id, "profileUpdate", req);
        }

        await User.save();

        res.json({
            ok: true,
            message: "Profile updated successfully.",
            userId: User._id
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            ok: false,
            message: "Internal server error."
        });

    } finally {

        const files = [
            ...(req.files?.profilePicture || []),
            ...(req.files?.banner || [])
        ];

        await Promise.all(
            files.map(file =>
                fs.promises.unlink(file.path).catch(() => { })
            )
        );

    }
});

Router.post("/sessions/revoke-all", verifyToken, loadUser, async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized", ok: false });
        }

        await Session.updateMany({ user: user._id }, { isRevoked: true });

        res.json({ message: "All sessions revoked successfully", ok: true });
    } catch (err) {
        console.error("Error in /sessions/revoke-all route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post("/sessions/:sessionId/revoke", verifyToken, loadUser, async (req, res) => {
    try {

        const user = res.locals.user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized", ok: false });
        }

        const sessionId = req.params.sessionId;

        await Session.updateOne({ _id: req.params.sessionId, user: user._id }, { isRevoked: true });

        res.json({ message: "Session revoked successfully", ok: true });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No image provided",
                ok: false
            });
        }

        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                message: "Invalid image type",
                ok: false
            });
        }

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB

        if (req.file.size > MAX_SIZE) {
            return res.status(400).json({
                message: "Image too large",
                ok: false
            });
        }

        const originalBuffer = await fs.promises.readFile(req.file.path);

        let processedBuffer;

        try {
            processedBuffer = await sharp(originalBuffer).rotate().resize({ width: 512, fit: "inside", withoutEnlargement: true, }).webp({ quality: 85 }).toBuffer();
        } catch (err) {
            return res.status(400).json({
                message: "Invalid image",
                ok: false
            });
        }

        const formData = new FormData();
        const filename = `upload_${Date.now()}.webp`;

        formData.append(
            "file",
            new Blob([processedBuffer], { type: "image/webp" }),
            crypto.randomUUID().replaceAll("-", "") + Date.now().toString(36) + Math.random().toString(36).slice(2) + req.file.originalname.replace(/\s+/g, "_").toLowerCase()
        );

        const response = await fetch(
            "https://cdn.hackclub.com/api/v4/upload",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.HC_CDN}`,
                },
                body: formData,
            }
        );

        const result = await response.json();

        if (!response.ok || !result.url) {
            return res.status(500).json({
                ok: false,
                message: "Failed to upload image",
            });
        }

        return res.status(200).json({
            ok: true,
            url: result.url,
        });
    } catch (err) {
        console.error("[ERROR] /upload", err);

        return res.status(500).json({
            ok: false,
            message: "Internal server error",
        });
    } finally {
        if (req.file?.path) {
            fs.promises.unlink(req.file.path).catch(() => { });
        }
    }
});

Router.post("/users/:userId/follow", verifyToken, loadUser, async (req, res) => {
    try {
        const user = res.locals.user;
        const remove = req.query.remove === "true";

        if (!user) {
            return res.status(401).json({
                ok: false,
                message: "Unauthorized."
            });
        }

        const targetUserId = req.params.userId;

        if (user._id.toString() === targetUserId) {
            return res.status(400).json({
                ok: false,
                message: "You cannot follow yourself."
            });
        }

        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({
                ok: false,
                message: "User not found."
            });
        }

        const isFollowing = user.following.some(
            id => id.toString() === targetUserId
        );

        if (isFollowing && !remove) {
            return res.status(400).json({
                ok: false,
                message: "You are already following this user."
            });
        }

        if (!isFollowing && remove) {
            return res.status(400).json({
                ok: false,
                message: "You are not following this user."
            });
        }

        if (remove) {
            user.following = user.following.filter(
                id => id.toString() !== targetUserId
            );

            targetUser.followers = targetUser.followers.filter(
                id => id.toString() !== user._id.toString()
            );

            await user.save();
            await targetUser.save();

            return res.json({
                ok: true,
                isFollowing: false,
                message: "Successfully unfollowed the user."
            });
        }

        user.following.push(targetUser._id);
        targetUser.followers.push(user._id);

        Notifications.create({
            user: targetUser._id,
            type: "follow",
            content: `${user.username} started following you.`,
            link: `/users/${user._id}`
        });

        await user.save();
        await targetUser.save();

        return res.json({
            ok: true,
            isFollowing: true,
            message: "Successfully followed the user."
        });

    } catch (err) {
        console.error("[ERROR] /follow/:userId", err);

        return res.status(500).json({
            ok: false,
            message: "Internal server error."
        });
    }
});


module.exports = Router;