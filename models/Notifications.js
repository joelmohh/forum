const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // was bare `ObjectId`
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['reply', 'mention', 'vote', 'login', 'follow', 'other', 'security', 'answer', 'accepted', 'comment'],
        required: true
    },
    content: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);