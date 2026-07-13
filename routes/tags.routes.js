const Router = require('express').Router();
const Tags = require('../models/Tags');
const User = require('../models/User');

const { verifyToken } = require('../modules/auth/AuthManager');

Router.get('/all', verifyToken, async (req, res) => {
    try {
        const tags = await Tags.find().sort({ name: 1 });
        res.json({ data: tags, ok: true });
    } catch (err) {
        console.error("Error in /tags/all route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.get('/search', async (req, res) => {
    try {
        const query  = req.query.q;

        if (!query) {
            return res.status(400).json({ message: "Missing search query", ok: false });
        }

        const tags = await Tags.find({ name: { $regex: query, $options: 'i' } }).sort({ name: 1 });

        res.json({ data: tags, ok: true });
    } catch (err) {
        console.error("Error in /tags/search route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/:tagName/follow', verifyToken, async (req, res) => {
    try {
        const { tagName } = req.params;

        if (!tagName) {
            return res.status(400).json({ message: "Missing tag name", ok: false });
        }

        const tag = await Tags.findOne({ name: tagName });

        if (!tag) {
            return res.status(404).json({ message: "Tag not found", ok: false });
        }

        const userId = res.locals.user._id;

        if (tag.followers.includes(userId)) {
            return res.status(400).json({ message: "You are already following this tag", ok: false });
        }

        tag.followers.push(userId);
        tag.followersCount += 1;
        await tag.save();

        await User.findByIdAndUpdate(userId, { $addToSet: { followedTags: tag._id } });

        res.json({ message: "Tag followed successfully", ok: true });
    } catch (err) {
        console.error("Error in /tags/follow route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/:tagName/unfollow', verifyToken, async (req, res) => {
    try {
        const { tagName } = req.params;

        if (!tagName) {
            return res.status(400).json({ message: "Missing tag name", ok: false });
        }

        const tag = await Tags.findOne({ name: tagName });

        if (!tag) {
            return res.status(404).json({ message: "Tag not found", ok: false });
        }

        const userId = res.locals.user._id;

        if (!tag.followers.includes(userId)) {
            return res.status(400).json({ message: "You are not following this tag", ok: false });
        }

        tag.followers.pull(userId);
        tag.followersCount -= 1;
        await tag.save();

        await User.findByIdAndUpdate(userId, { $pull: { followedTags: tag._id } });

        res.json({ message: "Tag unfollowed successfully", ok: true });
    } catch (err) {
        console.error("Error in /tags/unfollow route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

module.exports = Router;