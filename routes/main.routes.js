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

module.exports = Router;