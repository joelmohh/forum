const mongoose = require('mongoose');
const sessionSchema = new mongoose.Schema({
    user: {
        type: ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    token: {
        type: String,
        required: true,
        unique: true
    },

    expiresAt: {
        type: Date,
        required: true
    },

    ip: String,
    userAgent: String

}, { timestamps: true });
sessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);
module.exports = mongoose.model('Session', sessionSchema);