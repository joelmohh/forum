const mongoose = require('mongoose');

const questionCommentSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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

const postSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },

    content: {
        type: String,
        required: true,
        maxlength: 5000
    },

    tags: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Tag',
        index: true
    },

    score: {
        type: Number,
        default: 0,
        index: true
    },

    upvotes: {
        type: Number,
        default: 0
    },

    downvotes: {
        type: Number,
        default: 0
    },

    voters: {
        type: Map,
        of: Number, 
        default: {}
    },

    answersCount: {
        type: Number,
        default: 0
    },

    answers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer'
    }],

    acceptedAnswer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer',
        default: null
    },

    comments: {
        type: [questionCommentSchema],
        default: []
    },

    isPinned: {
        type: Boolean,
        default: false,
        index: true
    },

    isLocked: {
        type: Boolean,
        default: false
    },

    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    viewCount: {
        type: Number,
        default: 0
    },
    viewers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    }

}, {
    timestamps: true
});

postSchema.index({ createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ score: -1, createdAt: -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Question', postSchema);