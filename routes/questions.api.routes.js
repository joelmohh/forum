const Router = require('express').Router();
const fs = require('fs');

const multer = require("multer")
const upload = multer({ dest: 'uploads/' });

const dbUser = require('../models/User');
const Session = require('../models/Sessions');

const { verifyToken } = require('../modules/auth/AuthManager');
const { loadUser } = require('../modules/auth/loadUser');
const User = require('../models/User');
const Question = require('../models/Question');
const Tags = require('../models/Tags');
const Answers = require('../models/Answers');

Router.post('/new', verifyToken, loadUser, async (req, res) => {
    try {
        const { title, description, tags } = req.body;

        if (!title || !description || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({
                message: "Missing required fields",
                ok: false
            });
        }

        if (description.length > 5000) {
            return res.status(400).json({
                message: "Description is too long. Maximum length is 5000 characters.",
                ok: false
            });
        }

        if (title.length > 200) {
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

        const question = new Question({
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
                    $addToSet: { questions: question._id }
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

        const question = await Question.findById(questionId);

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
                    $pull: { questions: question._id }
                })
            )
        );

        await Promise.all(
            addedTags.map(tagId =>
                Tags.findByIdAndUpdate(tagId, {
                    $inc: { postsCount: 1 },
                    $addToSet: { questions: question._id }
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

Router.post('/delete/:id', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId } = req.params;

        if (!questionId) {
            return res.status(400).json({
                message: "Missing question ID",
                ok: false
            });
        }

        const question = await Question.findById(questionId);

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
                    $pull: { questions: question._id }
                })
            )
        );

        await Question.findByIdAndDelete(questionId);

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

Router.post('/vote/:id', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId } = req.params;
        const { voteType } = req.body;

        if (!questionId || !voteType) {
            return res.status(400).json({
                message: "Missing required fields",
                ok: false
            });
        }

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                ok: false
            });
        }

        const userId = res.locals.user._id.toString();
        const hasUpvoted = question.upvotes.includes(userId);
        const hasDownvoted = question.downvotes.includes(userId);

        if (voteType === 'upvote') {
            if (hasUpvoted) {
                question.upvotes.pull(userId);
            } else {
                question.upvotes.addToSet(userId);
                if (hasDownvoted) {
                    question.downvotes.pull(userId);
                }
            }
        } else if (voteType === 'downvote') {
            if (hasDownvoted) {
                question.downvotes.pull(userId);
            } else {
                question.downvotes.addToSet(userId);
                if (hasUpvoted) {
                    question.upvotes.pull(userId);
                }
            }
        } else {
            return res.status(400).json({
                message: "Invalid vote type",
                ok: false
            });
        }

        await question.save();

        return res.json({
            message: "Vote recorded successfully",
            ok: true,
            upvotesCount: question.upvotes.length,
            downvotesCount: question.downvotes.length
        });

    } catch (err) {
        console.error("[ERROR] /question/vote route:", err);

        return res.status(500).json({
            message: "Internal server error",
            ok: false
        });
    }
});

Router.post('/:id/answer', verifyToken, loadUser, async (req, res) => {
    try {
        const { content, questionId } = req.body;

        if (!questionId || !content) {
            return res.status(400).json({
                message: "Missing required fields",
                ok: false
            });
        }

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                ok: false
            });
        }

        const answer = await Answers.create({
            content,
            creator: res.locals.user._id,
            question: questionId
        });

        question.answers.push(answer._id);
        question.answersCount += 1;
        await question.save();

        return res.json({
            message: "Answer added successfully",
            ok: true,
            answerId: answer._id
        });

    } catch (err) {
        console.error("[ERROR] /question/:id/answer route:", err);

        return res.status(500).json({
            message: "Internal server error",
            ok: false
        });
    }
});

Router.post('/:questionId/answer/:answerId/comment', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId, answerId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                message: "Comment content is required",
                ok: false
            });
        }

        const answer = await Answers.findOne({
            _id: answerId,
            question: questionId,
            isDeleted: { $ne: true }
        });

        if (!answer) {
            return res.status(404).json({
                message: "Answer not found",
                ok: false
            });
        }

        answer.comments.push({
            creator: res.locals.user._id,
            question: questionId,
            content: content.trim()
        });

        await answer.save();

        return res.json({
            message: "Comment added successfully",
            ok: true
        });

    } catch (err) {
        console.error("[ERROR] /question/:questionId/answer/:answerId/comment route:", err);

        return res.status(500).json({
            message: "Internal server error",
            ok: false
        });
    }
});

module.exports = Router;