const Router = require('express').Router();

const { loadUser, needAuth } = require('../modules/auth/loadUser.js');
const Sessions = require("../models/Sessions");
const User = require('../models/User');
const Posts = require('../models/Posts');
const Comments = require('../models/Comments');

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


Router.get('/', (req, res) => {
    res.render('index')
})
Router.get('/login', (req, res) => {
    res.render('login')
})
Router.get('/signup', (req, res) => {
    res.render('signup')
})
Router.get('/users', async (req, res) => {
    const users = await User.find().select('username displayName profilePicture followers following createdAt');
    res.render('users', { users })
})
Router.get('/questions', (req, res) => {
    res.render('questions')
})
Router.get('/tags', (req, res) => {
    res.render('tags')
})
Router.get('/questions/ask', needAuth, (req, res) => {
    res.render('question-form')
})
Router.get('/questions/edit/:id', needAuth, (req, res) => {
    res.render('question-form')
})
Router.get('/questions/:id/', (req, res) => {
    res.render('question-detail')
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
        const posts = await Posts.find({ author: req.params.id });
        const comments = await Comments.find({ author: req.params.id });

        res.render('profile', { displayUser: user, posts: posts, comments: comments, currentUser: currentUser === req.params.id})
    }
})
Router.get('/logout', needAuth, (req, res) => {
    res.redirect('/api/auth/logout');
})

module.exports = Router;