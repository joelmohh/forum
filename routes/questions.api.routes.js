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

        if (!title || !description || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({
                message: "Missing required fields",
                ok: false
            });
        }

        if(description.length > 5000) {
            return res.status(400).json({
                message: "Description is too long. Maximum length is 5000 characters.",
                ok: false
            });
        }

        if(title.length > 200) {
            return res.status(400).json({
                message: "Title is too long. Maximum length is 200 characters.",
                ok: false
            });
        }
        
        const uniqueTags = [...new Set(
            tags
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0)
        )];

        const tagIds = await Promise.all(
            uniqueTags.map(async (tagName) => {
                let tag = await Tags.findOne({ name: tagName });

                if (!tag) {
                    tag = await Tags.create({
                        name: tagName,
                        createdBy: res.locals.user._id
                    });
                }

                return tag._id;
            })
        );

        const question = new Posts({
            creator: res.locals.user._id,
            title,
            content: description,
            tags: tagIds,
            slug: title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
        });

        await question.save();

        await Promise.all(
            tagIds.map(tagId =>
                Tags.findByIdAndUpdate(tagId, {
                    $inc: { postsCount: 1 },
                    $addToSet: { posts: question._id }
                })
            )
        );

        return res.json({
            message: "Question created successfully",
            ok: true,
            questionId: question._id
        });

    } catch (err) {
        console.error("[ERROR] /question/new route:", err);

        return res.status(500).json({
            message: "Internal server error",
            ok: false
        });
    }
});
Router.post('/edit', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId, title, description, tags } = req.body;

        if (
            !questionId ||
            !title ||
            !description ||
            !Array.isArray(tags) ||
            tags.length === 0
        ) {
            return res.status(400).json({
                message: "Missing required fields",
                ok: false
            });
        }

        const question = await Posts.findById(questionId);

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                ok: false
            });
        }

        if (question.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({
                message: "You are not authorized to edit this question",
                ok: false
            });
        }

        const uniqueTags = [...new Set(
            tags
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0)
        )];

        const tagIds = await Promise.all(
            uniqueTags.map(async (tagName) => {
                let tag = await Tags.findOne({ name: tagName });

                if (!tag) {
                    tag = await Tags.create({
                        name: tagName,
                        createdBy: res.locals.user._id
                    });
                }

                return tag._id;
            })
        );

        const oldTags = question.tags.map(id => id.toString());
        const newTags = tagIds.map(id => id.toString());

        const removedTags = oldTags.filter(id => !newTags.includes(id));
        const addedTags = newTags.filter(id => !oldTags.includes(id));

        await Promise.all(
            removedTags.map(tagId =>
                Tags.findByIdAndUpdate(tagId, {
                    $inc: { postsCount: -1 },
                    $pull: { posts: question._id }
                })
            )
        );

        await Promise.all(
            addedTags.map(tagId =>
                Tags.findByIdAndUpdate(tagId, {
                    $inc: { postsCount: 1 },
                    $addToSet: { posts: question._id }
                })
            )
        );

        question.title = title;
        question.content = description;
        question.tags = tagIds;
        question.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        await question.save();

        return res.json({
            message: "Question updated successfully",
            ok: true,
            questionId: question._id
        });

    } catch (err) {
        console.error("[ERROR] /question/edit route:", err);

        return res.status(500).json({
            message: "Internal server error",
            ok: false
        });
    }
});

Router.post('/delete', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId } = req.body;

        if (!questionId) {
            return res.status(400).json({
                message: "Missing question ID",
                ok: false
            });
        }

        const question = await Posts.findById(questionId);

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                ok: false
            });
        }

        if (question.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({
                message: "You are not authorized to delete this question",
                ok: false
            });
        }

        await Promise.all(
            question.tags.map(tagId =>
                Tags.findByIdAndUpdate(tagId, {
                    $inc: { postsCount: -1 },
                    $pull: { posts: question._id }
                })
            )
        );

        await Posts.findByIdAndDelete(questionId);

        return res.json({
            message: "Question deleted successfully",
            ok: true
        });

    } catch (err) {
        console.error("[ERROR] /question/delete route:", err);

        return res.status(500).json({
            message: "Internal server error",
            ok: false
        });
    }
});

module.exports = Router;