const mongoose = require('mongoose');

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

    media: [{
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['image', 'video']
        }
    }],

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
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

    answersCount: {
        type: Number,
        default: 0
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
    }

}, {
    timestamps: true
});

postSchema.index({ createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ score: -1, createdAt: -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);