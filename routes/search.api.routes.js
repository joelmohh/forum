const Router = require('express').Router();

const User = require('../models/User');
const Question = require('../models/Question');
const Tags = require('../models/Tags');

Router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const filter = search ? { username: { $regex: search, $options: 'i' } } : {};

        const total = await User.countDocuments(filter);
        const users = await User.find(filter).select('username displayName profilePicture followers following createdAt bio').skip(skip).limit(limit);

        res.json({ data: { users, page, limit, total }, ok: true });
    } catch (err) {
        console.error("Error in /search/users route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.get('/questions', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const filter = search ? { title: { $regex: search, $options: 'i' } } : {};

        const total = await Question.countDocuments(filter);
        const questions = await Question.find(filter).populate('creator', 'username displayName profilePicture').populate('tags', 'name').skip(skip).limit(limit);

        res.json({ data: { questions, page, limit, total }, ok: true });
    } catch (err) {
        console.error("Error in /search/questions route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.get('/tags', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

        const total = await Tags.countDocuments(filter);
        const tags = await Tags.find(filter).skip(skip).limit(limit);

        res.json({ data: { tags, page, limit, total }, ok: true });
    } catch (err) {
        console.error("Error in /search/tags route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.get('/global', async (req, res) => {
    try {
        const { search = '', limit = 5 } = req.query;
        const lim = Math.min(parseInt(limit, 10) || 5, 20);
        const term = search.trim();

        if (!term) {
            return res.json({
                data: {
                    users: [], tags: [], questions: [],
                    totals: { users: 0, tags: 0, questions: 0 }
                },
                ok: true
            });
        }

        const regexFilter = { $regex: term, $options: 'i' };

        const [userTotal, users, tagTotal, tags, questionTotal, questions] = await Promise.all([
            User.countDocuments({ username: regexFilter }),
            User.find({ username: regexFilter })
                .select('username displayName profilePicture')
                .limit(lim),
            Tags.countDocuments({ name: regexFilter }),
            Tags.find({ name: regexFilter })
                .select('name postsCount')
                .limit(lim),
            Question.countDocuments({ title: regexFilter }),
            Question.find({ title: regexFilter })
                .populate('creator', 'username displayName')
                .select('title creator')
                .limit(lim)
        ]);

        res.json({
            data: {
                users, tags, questions,
                totals: { users: userTotal, tags: tagTotal, questions: questionTotal }
            },
            ok: true
        });
    } catch (err) {
        console.error("Error in /search/global route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

module.exports = Router;