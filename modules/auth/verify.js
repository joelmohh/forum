const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET

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

module.exports = verifyToken;