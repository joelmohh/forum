const validateSession = require('./AuthManager').validateSession;
const loadUser = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            res.locals.user = null;
            return next();
        }

        const user = await validateSession(refreshToken);

        res.locals.user = user || null;

        next();
    } catch (err) {
        console.error(err);

        res.locals.user = null;

        next();
    }
};

const needAuth = (req, res, next) => {
    if (!res.locals.user) {
        return res.status(401).redirect('/login');
    }
    next();
};

module.exports = { loadUser, needAuth };