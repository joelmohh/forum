const Router = require('express').Router();

const { loadUser, needAuth } = require('../modules/auth/loadUser.js');
const Sessions = require("../models/Sessions");
const User = require('../models/User');
const Posts = require('../models/Posts');
const Comments = require('../models/Comments');
const Tags = require('../models/Tags');

const marked = require('marked');

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
    const questions = await Posts.find().populate('creator', 'username displayName profilePicture').populate('tags', 'name').limit(10);
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
    const questions = await Posts.find(filter).populate('creator', 'username displayName profilePicture').populate('tags', 'name')
    res.render('questions', { questions, query: req.query, page, limit, total })
})

Router.get('/tags', async (req, res) => {
    const tags = await Tags.find();
    res.render('tags', { tags })
})
Router.get('/questions/ask', needAuth, (req, res) => {
    res.render('question-form')
})
Router.get('/questions/edit/:id', needAuth, async (req, res) => {
    const question = await Posts.findById(req.params.id);
    if (!question) {
        return res.status(404).send('Question not found');
    }

    if (question.creator.toString() !== res.locals.user._id.toString()) {
        return res.render('question-detail', { question: question, error: 'You are not authorized to edit this question.', editMode: false });
    }

    res.render('question-form', { questionId: req.params.id, editMode: true, question: question })
})
Router.get('/questions/:id/', async (req, res) => {
    const question = await Posts.findById(req.params.id).populate('creator', 'username displayName profilePicture').populate('tags', 'name');
    const comments = await Comments.find({ post: req.params.id }).populate('creator', 'username displayName profilePicture bio');

    question.content = marked.parse(question.content);

    if (!question) {
        return res.status(404).send('Question not found');
    }
    res.render('question-detail', { question: question, comments: comments })
})
Router.get('/users/:id/settings', needAuth, async (req, res) => {
    let currentDevice 
    if (res.locals.user) {
        const userSessions = await Sessions.find({ user: res.locals.user._id });
        const currentSession = userSessions.find(session => session.tokenHash.toString() === crypto.createHash("sha256").update(req.cookies.refreshToken).digest("hex"));
        if(currentSession) currentDevice = currentSession._id;
    }
    
    let devices = [];
    //console.log(res.locals.user._id)
    if (res.locals.user) {
        const userSessions = await Sessions.find({ user: res.locals.user._id });
        // console.log(userSessions)
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
    const currentUser = res.locals.user_id;
    if(req.params.id){

        const user = await User.findById(req.params.id);
        const posts = await Posts.find({ creator: req.params.id }).populate('creator', 'username displayName profilePicture').populate('tags', 'name');
        const comments = await Comments.find({ creator: req.params.id }).populate('creator', 'username displayName profilePicture bio');

        console.log(user)

        res.render('profile', { displayUser: user, posts: posts, comments: comments, currentUser: currentUser === req.params.id})
    }
})
Router.get('/logout', needAuth, (req, res) => {
    res.redirect('/api/auth/logout');
})

module.exports = Router;