const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 100
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Posts'
    }],
    postsCount: {
        type: Number,
        default: 0
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    followersCount: {
        type: Number,
        default: 0
    },
    aliases: [{
        type: String,
        trim: true,
        maxlength: 100
    }]
}, {
    timestamps: true
});


module.exports = mongoose.model('Tag', tagSchema);