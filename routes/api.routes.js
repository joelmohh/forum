const Router = require('express').Router();
const fs = require('fs');

const multer = require("multer")
const upload = multer({ dest: 'uploads/' });

const dbUser = require('../models/User');

const { verifyToken } = require('../modules/auth/AuthManager');

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

            const ext = req.file.originalname.split('.').pop().toLowerCase();

            if (!["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {

                updatedProfilePicture = "https://user-cdn.hackclub-assets.com/019ed71d-3a74-701f-96af-d8cde51fa768/profile_joelmo_1781725476683.png";

            } else {

                const formData = new FormData();
                const file = new Blob([
                    await fs.promises.readFile(req.file.path)
                ]);
                formData.append("file", file, `profile_${username}_${Date.now()}.${req.file.originalname.split('.').pop()}`);

                const response = await fetch("https://cdn.hackclub.com/api/v4/upload", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.HC_CDN}`
                    },
                    body: formData
                })

                const result = await response.json();
                if (response.ok && result.url) {
                    updatedProfilePicture = result.url;
                } else {
                    updatedProfilePicture = "https://user-cdn.hackclub-assets.com/019ed71d-3a74-701f-96af-d8cde51fa768/profile_joelmo_1781725476683.png";
                }
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


module.exports = Router;