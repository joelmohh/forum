const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index: true
    },

    content: {
        type: String,
        required: true,
        maxlength: 2000
    },

    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },

    depth: {
        type: Number,
        default: 0
    },

    score: {
        type: Number,
        default: 0
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

commentSchema.index({ post: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);