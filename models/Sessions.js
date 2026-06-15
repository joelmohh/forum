const mongoose = require('mongoose');
const sessionSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        unique: true
    },

    refreshTokenId: {
        type: String,
        index: true
    },

    deviceId: {
        type: String,
        index: true
    },

    ip: String,
    userAgent: String,

    revokedAt: Date,

    lastUsedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });
sessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);
module.exports = mongoose.model('Session', sessionSchema);