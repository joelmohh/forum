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
const Notifications = require('../models/Notifications');

const VOTABLE_MODELS = {
    question: Question,
    answer: Answers
};

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

        if (uniqueTags.length === 0) {
            return res.status(400).json({
                message: "At least one valid tag is required",
                ok: false
            });
        }

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

        let baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        if (!baseSlug) {
            baseSlug = 'question';
        }

        let slug = baseSlug;
        let suffix = 1;

        while (await Question.exists({ slug })) {
            slug = `${baseSlug}-${suffix}`;
            suffix++;
        }

        const question = new Question({
            creator: res.locals.user._id,
            title,
            content: description,
            tags: tagIds,
            slug
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

        Tags.find({ _id: { $in: tagIds } }).then(tagsForNotification => {
            const notificationDocs = [];

            for (const tag of tagsForNotification) {
                if (!tag.followers || tag.followers.length === 0) continue;

                for (const followerId of tag.followers) {
                    if (followerId.toString() === res.locals.user._id.toString()) continue;

                    notificationDocs.push({
                        user: followerId,
                        type: "tag",
                        content: `${res.locals.user.username} created a new question in "${tag.name}", a tag you follow`,
                        link: `/questions/${question._id}`
                    });
                }
            }

            if (notificationDocs.length > 0) {
                return Notifications.insertMany(notificationDocs);
            }
        }).catch(err => console.error("[ERROR] creating tag follower notifications:", err));

        return res.json({
            message: "Question created successfully",
            ok: true,
            questionId: question._id,
            slug
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                message: "A question with a similar title already exists. Please try a slightly different title.",
                ok: false
            });
        }

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
        question.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'question';

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

Router.post('/vote/:targetType/:targetId', verifyToken, loadUser, async (req, res) => {
    try {
        const { targetType, targetId } = req.params;
        const { voteType } = req.body;

        const Model = VOTABLE_MODELS[targetType];

        if (!Model) {
            return res.status(400).json({ message: "Invalid target type", ok: false });
        }

        if (!['upvote', 'downvote'].includes(voteType)) {
            return res.status(400).json({ message: "Invalid vote type", ok: false });
        }

        const target = await Model.findById(targetId);

        if (!target || target.isDeleted) {
            return res.status(404).json({ message: "Target not found", ok: false });
        }

        const userId = res.locals.user._id.toString();
        const requestedVote = voteType === 'upvote' ? 1 : -1;
        const currentVote = target.voters.get(userId);

        if (currentVote === requestedVote) {
            target.voters.delete(userId);
            if (requestedVote === 1) target.upvotes -= 1;
            else target.downvotes -= 1;
        } else {
            if (currentVote === 1) target.upvotes -= 1;
            if (currentVote === -1) target.downvotes -= 1;

            target.voters.set(userId, requestedVote);
            if (requestedVote === 1) target.upvotes += 1;
            else target.downvotes += 1;
        }

        target.score = target.upvotes - target.downvotes;
        target.markModified('voters');

        await target.save();

        return res.json({
            message: "Vote recorded successfully",
            ok: true,
            score: target.score,
            upvotesCount: target.upvotes,
            downvotesCount: target.downvotes,
            userVote: target.voters.get(userId) ?? null
        });

    } catch (err) {
        console.error("[ERROR] /vote route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
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

        if (content.trim().length < 10 || content.length > 2000) {
            return res.status(400).json({
                message: "Answer must be between 10 and 2000 characters.",
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
            content: content.trim(),
            creator: res.locals.user._id,
            question: questionId
        });

        question.answers.push(answer._id);
        question.answersCount += 1;
        await question.save();

        if (question.creator.toString() !== res.locals.user._id.toString()) {
            Notifications.create({
                user: question.creator,
                type: "answer",
                content: `${res.locals.user.username} answered your question "${question.title}"`,
                link: `/questions/${question._id}`
            }).catch(err => console.error("[ERROR] creating answer notification:", err));
        }

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

Router.post('/answer/:answerId/edit', verifyToken, loadUser, async (req, res) => {
    try {
        const { answerId } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length < 10) {
            return res.status(400).json({ message: "Answer must be at least 10 characters.", ok: false });
        }

        if (content.length > 2000) {
            return res.status(400).json({ message: "Answer is too long. Maximum 2000 characters.", ok: false });
        }

        const answer = await Answers.findById(answerId);

        if (!answer || answer.isDeleted) {
            return res.status(404).json({ message: "Answer not found", ok: false });
        }

        if (answer.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this answer", ok: false });
        }

        answer.content = content.trim();
        answer.isEdited = true;
        answer.lastEditedAt = new Date();

        await answer.save();

        return res.json({ message: "Answer updated successfully", ok: true });

    } catch (err) {
        console.error("[ERROR] /answer/:answerId/edit route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/answer/:answerId/delete', verifyToken, loadUser, async (req, res) => {
    try {
        const { answerId } = req.params;

        const answer = await Answers.findById(answerId);

        if (!answer || answer.isDeleted) {
            return res.status(404).json({ message: "Answer not found", ok: false });
        }

        if (answer.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this answer", ok: false });
        }

        answer.isDeleted = true;
        await answer.save();

        const update = {
            $inc: { answersCount: -1 },
            $pull: { answers: answer._id }
        };

        const question = await Question.findById(answer.question);
        if (question?.acceptedAnswer?.toString() === answer._id.toString()) {
            update.$set = { acceptedAnswer: null };
        }

        await Question.findByIdAndUpdate(answer.question, update);

        return res.json({ message: "Answer deleted successfully", ok: true });

    } catch (err) {
        console.error("[ERROR] /answer/:answerId/delete route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/:questionId/answer/:answerId/accept', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId, answerId } = req.params;

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({ message: "Question not found", ok: false });
        }

        if (question.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "Only the question author can accept an answer", ok: false });
        }

        const answer = await Answers.findOne({ _id: answerId, question: questionId, isDeleted: { $ne: true } });

        if (!answer) {
            return res.status(404).json({ message: "Answer not found", ok: false });
        }

        // Clicou na resposta já aceita -> desmarca
        if (question.acceptedAnswer && question.acceptedAnswer.toString() === answerId) {
            question.acceptedAnswer = null;
            answer.isAnswer = false;

            await Promise.all([question.save(), answer.save()]);

            return res.json({ message: "Answer unmarked as accepted", ok: true, accepted: false });
        }

        // Desmarca a resposta aceita anterior, se houver
        if (question.acceptedAnswer) {
            await Answers.findByIdAndUpdate(question.acceptedAnswer, { isAnswer: false });
        }

        question.acceptedAnswer = answer._id;
        answer.isAnswer = true;

        await Promise.all([question.save(), answer.save()]);

        if (answer.creator.toString() !== res.locals.user._id.toString()) {
            Notifications.create({
                user: answer.creator,
                type: "accepted",
                content: `${res.locals.user.username} accepted your answer to "${question.title}"`,
                link: `/questions/${question._id}`
            }).catch(err => console.error("[ERROR] creating accept notification:", err));
        }

        return res.json({ message: "Answer accepted", ok: true, accepted: true });

    } catch (err) {
        console.error("[ERROR] /:questionId/answer/:answerId/accept route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

// Answers 

Router.post('/:questionId/answer/:answerId/comment', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId, answerId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim() || content.length > 500) {
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

        if (answer.creator.toString() !== res.locals.user._id.toString()) {
            Notifications.create({
                user: answer.creator,
                type: "comment",
                content: `${res.locals.user.username} commented on your answer`,
                link: `/questions/${questionId}`
            }).catch(err => console.error("[ERROR] creating answer comment notification:", err));
        }

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

Router.post('/answer/:answerId/comment/:commentId/edit', verifyToken, loadUser, async (req, res) => {
    try {
        const { answerId, commentId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim() || content.length > 500) {
            return res.status(400).json({ message: "Invalid comment content", ok: false });
        }

        const answer = await Answers.findById(answerId);

        if (!answer) {
            return res.status(404).json({ message: "Answer not found", ok: false });
        }

        const comment = answer.comments.id(commentId);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found", ok: false });
        }

        if (comment.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this comment", ok: false });
        }

        comment.content = content.trim();
        comment.isEdited = true;
        comment.lastEditedAt = new Date();

        await answer.save();

        return res.json({ message: "Comment updated successfully", ok: true });

    } catch (err) {
        console.error("[ERROR] /answer/:answerId/comment/:commentId/edit route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/answer/:answerId/comment/:commentId/delete', verifyToken, loadUser, async (req, res) => {
    try {
        const { answerId, commentId } = req.params;

        const answer = await Answers.findById(answerId);

        if (!answer) {
            return res.status(404).json({ message: "Answer not found", ok: false });
        }

        const comment = answer.comments.id(commentId);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found", ok: false });
        }

        if (comment.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this comment", ok: false });
        }

        comment.deleteOne();
        await answer.save();

        return res.json({ message: "Comment deleted successfully", ok: true });

    } catch (err) {
        console.error("[ERROR] /answer/:answerId/comment/:commentId/delete route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

// Questions

Router.post('/:questionId/comment', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim() || content.length > 500) {
            return res.status(400).json({ message: "Invalid comment content", ok: false });
        }

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({ message: "Question not found", ok: false });
        }

        question.comments.push({
            creator: res.locals.user._id,
            content: content.trim()
        });

        await question.save();

        if (question.creator.toString() !== res.locals.user._id.toString()) {
            Notifications.create({
                user: question.creator,
                type: "comment",
                content: `${res.locals.user.username} commented on your question "${question.title}"`,
                link: `/questions/${question._id}`
            }).catch(err => console.error("[ERROR] creating question comment notification:", err));
        }

        return res.json({ message: "Comment added successfully", ok: true });

    } catch (err) {
        console.error("[ERROR] /:questionId/comment route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/:questionId/comment/:commentId/edit', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId, commentId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim() || content.length > 500) {
            return res.status(400).json({ message: "Invalid comment content", ok: false });
        }

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({ message: "Question not found", ok: false });
        }

        const comment = question.comments.id(commentId);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found", ok: false });
        }

        if (comment.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this comment", ok: false });
        }

        comment.content = content.trim();
        comment.isEdited = true;
        comment.lastEditedAt = new Date();

        await question.save();

        return res.json({ message: "Comment updated successfully", ok: true });

    } catch (err) {
        console.error("[ERROR] /:questionId/comment/:commentId/edit route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/:questionId/comment/:commentId/delete', verifyToken, loadUser, async (req, res) => {
    try {
        const { questionId, commentId } = req.params;

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({ message: "Question not found", ok: false });
        }

        const comment = question.comments.id(commentId);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found", ok: false });
        }

        if (comment.creator.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this comment", ok: false });
        }

        comment.deleteOne();
        await question.save();

        return res.json({ message: "Comment deleted successfully", ok: true });

    } catch (err) {
        console.error("[ERROR] /:questionId/comment/:commentId/delete route:", err);
        return res.status(500).json({ message: "Internal server error", ok: false });
    }
});

module.exports = Router;