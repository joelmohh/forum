const mongoose = require('mongoose');

const answerCommentSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
        index: true
    },

    content: {
        type: String,
        required: true,
        maxlength: 500
    },

    isEdited: {
        type: Boolean,
        default: false
    },

    lastEditedAt: {
        type: Date,
        default: null
    }

}, { timestamps: true });

const answerSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
        index: true
    },

    content: {
        type: String,
        required: true,
        maxlength: 2000
    },

    score: {
        type: Number,
        default: 0
    },

    voters: {
        type: Map,
        of: Number,
        default: {}
    },

    upvotes: {
        type: Number,
        default: 0
    },

    downvotes: {
        type: Number,
        default: 0
    },

    isEdited: {
        type: Boolean,
        default: false
    },

    lastEditedAt: {
        type: Date,
        default: null
    },

    isPinned: {
        type: Boolean,
        default: false
    },

    isAnswer: {
        type: Boolean,
        default: false
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    comments: {
        type: [answerCommentSchema],
        default: []
    }

}, { timestamps: true });

answerSchema.index({ question: 1, createdAt: 1 });

module.exports = mongoose.model('Answer', answerSchema);