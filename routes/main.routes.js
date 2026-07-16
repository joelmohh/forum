const Router = require('express').Router();

const { loadUser, needAuth } = require('../modules/auth/loadUser.js');
const Sessions = require("../models/Sessions");
const User = require('../models/User');
const Question = require('../models/Question');
const Answers = require('../models/Answers');
const Tags = require('../models/Tags');

const { marked } = require('marked');

const crypto = require('crypto');


Router.use(loadUser);
function normalizeUserAgent(ua) {
    if (/mobile/i.test(ua)) {
        return "Mobile Device";
    } else if (/like Mac OS X/.test(ua)) {
        return "iOS Device";
    } else if (/Android/.test(ua)) {
        return "Android Device";
    } else if (/Windows NT/.test(ua)) {
        return "Windows PC";
    } else if (/Macintosh/.test(ua)) {
        return "Mac";
    } else if (/Linux/.test(ua)) {
        return "Linux";
    } else {
        return "Unknown Device";
    }
}


Router.get('/', async (req, res) => {
    const questions = await Question.find().populate('creator', 'username displayName profilePicture').populate('tags', 'name').limit(10);
    res.render('index', { questions })
})
Router.get('/login', (req, res) => {
    res.render('login')
})
Router.get('/signup', (req, res) => {
    res.render('signup')
})
Router.get('/users', async (req, res) => {
    const users = await User.find().select('username displayName profilePicture followers following createdAt bio');
    res.render('users', { users })
})
Router.get('/questions', async (req, res) => {
    const questions = await Question.find().populate('creator', 'username displayName profilePicture').populate('tags', 'name')
    res.render('questions', { questions })
})

Router.get('/tags', async (req, res) => {
    const tags = await Tags.find();
    const user = await User.findById(res.locals.user?._id).select('followedTags');
    res.render('tags', { tags, user })
})
Router.get('/questions/ask', needAuth, (req, res) => {
    res.render('question-form', { editMode: false, questionId: null, question: null, tags: [], allTags: [] })
})
Router.get('/questions/edit/:id', needAuth, async (req, res) => {
    const question = await Question.findById(req.params.id);
    const allTags = await Tags.find();

    if (!question) {
        return res.redirect('/questions');
    }

    if (question.creator.toString() !== res.locals.user._id.toString()) {
        return res.render('question-detail', {
            question,
            error: 'You are not authorized to edit this question.',
            editMode: false
        });
    }

    const selectedTags = [];

    question.tags.forEach(tagId => {
        const tag = allTags.find(t => t._id.toString() === tagId.toString());

        if (tag) {
            selectedTags.push(tag.name);
        }
    });

    res.render('question-form', {
        questionId: req.params.id,
        editMode: true,
        question,
        tags: selectedTags,
        allTags
    });
});

Router.get('/questions/:id/', async (req, res) => {
    const question = await Question.findById(req.params.id).populate('creator', 'username displayName profilePicture').populate('tags', 'name');

    if (!question) {
        return res.redirect('/questions');
    }

    const answers = await Answers.find({ question: req.params.id }).sort({ score: -1, createdAt: 1 }).populate('creator', 'username displayName profilePicture bio').populate('comments.creator', 'username displayName profilePicture');

    question.content = marked.parse(question.content);

    res.render('question-detail', { question: question, answers: answers, isSelf: res.locals.user?._id.toString() === question.creator._id.toString() })
})
Router.get('/users/:id/settings', needAuth, async (req, res) => {
    let currentDevice
    if (res.locals.user) {
        const userSessions = await Sessions.find({ user: res.locals.user._id });
        const currentSession = userSessions.find(session => session.tokenHash.toString() === crypto.createHash("sha256").update(req.cookies.refreshToken).digest("hex"));
        if (currentSession) currentDevice = currentSession._id;
    }

    let devices = [];
    if (res.locals.user) {
        const userSessions = await Sessions.find({ user: res.locals.user._id });
        devices = userSessions.map(session => ({
            id: session._id,
            ip: session.ip,
            userAgent: normalizeUserAgent(session.userAgent),
            lastUsedAt: session.lastUsedAt,
            revoked: session.isRevoked,
            isCurrent: session._id.toString() === currentDevice.toString()
        }));
    }
    res.render('profile-settings', { devices })
})
Router.get('/users/:id', async (req, res) => {
    if (res.locals.user) {
        const isSelf = res.locals.user._id;
    }
    if (req.params.id) {

        const user = await User.findById(req.params.id).select('username displayName profilePicture followers following createdAt bio banner bannerColor').populate('followers', 'username displayName profilePicture').populate('following', 'username displayName profilePicture');
        const questions = await Question.find({ creator: req.params.id }).populate('creator', 'username displayName profilePicture').populate('tags', 'name');
        const answers = await Answers.find({ creator: req.params.id }).populate('creator', 'username displayName profilePicture bio').populate('question', 'title slug');

        let isFollowing;

        if (res.locals.user) {
            const currentU = await User.findById(res.locals.user._id).select("following");
            isFollowing = currentU.following.some(id => id.toString() === req.params.id)
        } else {
            isFollowing = false;
        }


        questions.forEach(question => {
            question.excerpt = question.content.length > 300 ? question.content.substring(0, 300) + '…' : question.content;

            question.content = marked.parse(question.excerpt);
        })

        answers.forEach(answers => {
            answers.content = marked.parse(answers.content);
        })

        if (!user) {
            return res.redirect('/users');
        }

        let isSelf = false;
        if (isSelf && isSelf.toString() === req.params.id) {
            isSelf = true;
        }

        res.render('profile', { displayUser: user, questions: questions, answers: answers, isSelf: isSelf, following: isFollowing })
    }
})
Router.get('/logout', needAuth, (req, res) => {
    res.redirect('/api/auth/logout');
})

Router.get('/forgot-password', (req, res) => {
    res.render('resetAccount');
});

module.exports = Router;