const Router = require('express').Router();

const User = require('../models/User');

const { verifyToken } = require('../modules/auth/AuthManager');

Router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        res.json({ user: { id: user._id, email: user.email, name: user.name } });
    } catch (err) {
        console.error("Error in /me route:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = Router;