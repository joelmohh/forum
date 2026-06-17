const User = require('../../models/User');
const Session = require('../../models/Sessions');
const crypto = require('crypto');

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

const newSession = async (user, { deviceId, ip, userAgent } = {}) => {
    try {
        const refreshToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        await Session.create({
            user: user._id,
            tokenHash,
            deviceId,
            ip,
            userAgent,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lastUsedAt: new Date()
        });

        return refreshToken;

    } catch (err) {
        console.error("Error creating session:", err);

        return null;
    }
};
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(403).json({ message: "No token provided." });
    }

    const token = authHeader.startsWith("Bearer ")? authHeader.slice(7): authHeader;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Unauthorized." });
        }

        req.userId = decoded.sub || decoded.id;
        next();
    });
};

const validateSession = async (refreshToken) => {
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await Session.findOne({ tokenHash }).populate("user");

    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    session.lastUsedAt = new Date();
    await session.save();

    return session.user;
}

module.exports = { generateToken, updateLastLogin, newSession, verifyToken, validateSession };