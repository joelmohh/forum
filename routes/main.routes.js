const Router = require('express').Router();

Router.get('/', (req, res) => {
    res.render('index')
})
Router.get('/login', (req, res) => {
    res.render('login')
})
Router.get('/signup', (req, res) => {
    res.render('signup')
})
Router.get('/users', (req, res) => {
    res.render('users')
})
Router.get('/settings', (req, res) => {
    res.render('settings')
})
Router.get('/questions', (req, res) => {
    res.render('questions')
})
Router.get('/tags', (req, res) => {
    res.render('tags')
})
Router.get('/questions/ask', (req, res) => {
    res.render('question-form')
})
Router.get('/questions/edit/:id', (req, res) => {
    res.render('question-form')
})
Router.get('/questions/:id/', (req, res) => {
    res.render('question-detail')
})
Router.get('/profile/settings', (req, res) => {
    res.render('profile-settings')
})
module.exports = Router;