const User = require('../models/User');
const Session = require('../models/Sessions');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (user) => {
    return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
}

const updateLastLogin = async (userId) => {
    try {
        await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
    } catch (err) {
        console.error('Error updating last login:', err);
    }
}

const newSession = async (user, userAgent, ip) => {
    try {
        const session = new Session({
            user: user._id,
            token: generateToken(user),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            ip,
            userAgent
        });
        await session.save();
        return session.token;
    } catch (err) {
        console.error('Error creating new session:', err);
        return null;
    }
}

const validateSession = async (token) => {
    try {
        const session = await Session.findOne({ token }).populate('user');
        if (!session || session.expiresAt < new Date()) {
            return null;
        }
        return session.user;
    } catch (err) {
        console.error('Error validating session:', err);
        return null;
    }
}
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }
        if (decoded.exp < Date.now() / 1000) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }
        req.userId = decoded.id;
        next();
    });
};


module.exports = { generateToken, updateLastLogin, newSession, validateSession, verifyToken };