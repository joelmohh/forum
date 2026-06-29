const Router = require('express').Router();
const fs = require('fs');

const multer = require("multer")
const upload = multer({ dest: 'uploads/' });

const dbUser = require('../models/User');
const Session = require('../models/Sessions');

const { verifyToken } = require('../modules/auth/AuthManager');
const { loadUser } = require('../modules/auth/loadUser');
const User = require('../models/User');
const Posts = require('../models/Posts');
const Tags = require('../models/Tags');

Router.post('/new', verifyToken, loadUser, async (req, res) => {
    try {

        const { title, description, tags } = req.body;

        if (!title || !description || !tags) {
            return res.status(400).json({ message: "Missing required fields", ok: false });
        }

        let tagIds = [];

        tags.forEach(async (tagName) => {
            let tag = await Tags.findOne({ name: tagName });
            if (!tag) {
                tag = new Tags({ name: tagName, createdBy: res.locals.user._id });
                await tag.save();
            }
            tagIds.push(tag._id);
        });


        const question = new Posts({
            creator: res.locals.user._id,
            title: title,
            content: description,
            tags: tagIds,
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        });

        await question.save();

        res.json({ message: "Question created successfully", ok: true, questionId: question._id });

    }catch (err) { 
        console.log("[ERROR] /question/new route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
})
Router.post('/edit', verifyToken, loadUser, async (req, res) => {
    try {

        const { title, description, tags } = req.body;

        if (!title || !description || !tags) {
            return res.status(400).json({ message: "Missing required fields", ok: false });
        }

        let tagIds = [];

        tags.forEach(async (tagName) => {
            let tag = await Tags.findOne({ name: tagName });
            if (!tag) {
                tag = new Tags({ name: tagName, createdBy: res.locals.user._id });
                await tag.save();
            }
            tagIds.push(tag._id);
        });

        const question = Posts.findByIdAndUpdate(req.params.questionId, {
            creator: res.locals.user._id,
            title: title,
            content: description,
            tags: tagIds,
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }, { new: true });

        await question.save();

        res.json({ message: "Question updated successfully", ok: true, questionId: question._id });

    }catch (err) { 
        console.log("[ERROR] /question/new route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
})

Router.post('/delete', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId } = req.body;

        if (!questionId) {
            return res.status(400).json({ message: "Missing question ID", ok: false });
        }

        const question = await Posts.findById(questionId);

        if (!question) {
            return res.status(404).json({ message: "Question not found", ok: false });
        }

        if (question.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this question", ok: false });
        }

        await Posts.deleteOne({ _id: questionId });

        res.json({ message: "Question deleted successfully", ok: true });

    } catch (err) {
        console.log("[ERROR] /question/delete route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

module.exports = Router;