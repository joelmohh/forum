const Router = require('express').Router();
const fs = require('fs');
const sharp = require("sharp");

const multer = require("multer")
const upload = multer({ dest: 'uploads/' });

const dbUser = require('../models/User');
const Session = require('../models/Sessions');

const { verifyToken } = require('../modules/auth/AuthManager');
const { loadUser } = require('../modules/auth/loadUser');
const User = require('../models/User');
const Posts = require('../models/Posts');

Router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        res.json({ user: { id: user._id, email: user.email, username: user.username, name: user.displayName, profilePicture: user.profilePicture, bio: user.bio } });
    } catch (err) {
        console.error("Error in /me route:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

Router.post("/me/update", verifyToken, upload.single('profilePicture'), async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const User = await dbUser.findById(user._id);
        const { bio, displayName } = req.body;

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        const username = User.username;

        let updatedProfilePicture = null;

        if (req.file) {

            const allowedMimeTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];

            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    message: "Invalid image type"
                });
            }

            const MAX_SIZE = 5 * 1024 * 1024; // 5MB

            if (req.file.size > MAX_SIZE) {
                return res.status(400).json({
                    message: "Image too large"
                });
            }

            const originalBuffer = await fs.promises.readFile(req.file.path);

            let processedBuffer;

            try {

                processedBuffer = await sharp(originalBuffer).rotate().resize({ width: 512, height: 512, fit: "cover" }).webp({ quality: 85 }).toBuffer();

            } catch (err) {

                return res.status(400).json({
                    message: "Invalid image"
                });

            }

            const formData = new FormData();

            formData.append("file", new Blob([processedBuffer], { type: "image/webp" }), `profile_${username}_${Date.now()}.webp`);

            const response = await fetch("https://cdn.hackclub.com/api/v4/upload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.HC_CDN}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.url) {
                updatedProfilePicture = result.url;
            } else {
                return res.status(500).json({
                    message: "Failed to upload image"
                });
            }
        }
        if (displayName) {
            User.displayName = displayName;
        }
        if (updatedProfilePicture) {
            User.profilePicture = updatedProfilePicture;
        }
        if (bio) {
            User.bio = bio
        }
        await User.save();
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Error in /me/update route:", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        if (req.file?.path) {
            fs.promises.unlink(req.file.path).catch(() => { });
        }
    }
});

Router.post("/sessions/revoke-all", verifyToken, loadUser, async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
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
            return res.status(401).json({ message: "Unauthorized A" });
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
                ok: false,
                message: "No image provided",
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
                ok: false,
                message: "Invalid image type",
            });
        }

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB

        if (req.file.size > MAX_SIZE) {
            return res.status(400).json({
                ok: false,
                message: "Image too large",
            });
        }

        const originalBuffer = await fs.promises.readFile(req.file.path);

        let processedBuffer;

        try {
            processedBuffer = await sharp(originalBuffer).rotate().resize({ width: 512, fit: "inside", withoutEnlargement: true, }).webp({ quality: 85 }).toBuffer();
        } catch (err) {
            return res.status(400).json({
                ok: false,
                message: "Invalid image",
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

Router.get("/paginate", async (req, res) => {

    const type = req.query.type;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};

    if (type === "questions") {
        const total = await Posts.countDocuments(filter);
        const questions = await Posts.find(filter).populate('creator', 'username displayName profilePicture').populate('tags', 'name').skip(skip).limit(limit);
        return res.json({ questions, page, limit, total });
    } else if (type === "users") {
        const total = await User.countDocuments(filter);
        const users = await User.find().select('username displayName profilePicture followers following createdAt bio').skip(skip).limit(limit);
        return res.json({ users, page, limit, total });
    } else if(type === "tags") {
        const total = await Tags.countDocuments(filter);
        const tags = await Tags.find(filter).skip(skip).limit(limit);
        return res.json({ tags, page, limit, total });
    } else {
        return res.status(400).json({ message: "Invalid type parameter" });
    }

})


module.exports = Router;