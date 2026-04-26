const mongoose = require('mongoose')
const SocialConnections = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    platform: {
        type: String,
        required: true,
        enum: ['google', 'github', 'discord', 'twitter']
    },

    connectionId: {
        type: String,
        required: true
    }

}, { timestamps: true });

SocialConnections.index(
    { platform: 1, connectionId: 1 },
    { unique: true }
);

module.exports = mongoose.model('SocialConnection', SocialConnections);