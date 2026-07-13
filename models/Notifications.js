const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
    user: {
        type: ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    type: {
        type: String,
        enum: ['reply', 'mention', 'vote']
    },

    question: { type: ObjectId, ref: 'Question' },
    comment: { type: ObjectId, ref: 'Comment' },

    isRead: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);