const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        index: true
    },
    displayName: {
        type: String,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],

    followedTags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
        default: []
    }],

    lastLogin: Date,

    profilePicture: {
        type: String,
        default: "https://via.placeholder.com/150?text=Profile+Picture"
    },

    bio: {
        type: String,
        maxlength: 500
    },

    verified: {
        type: Boolean,
        default: false,
        index: true
    },

    banner: {
        type: String,
        default: "https://via.placeholder.com/800x200?text=Banner"
    },

    bannerColor: {
        type: String,
        default: "#ff9d00"
    },

    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user',
        index: true
    },

    isBanned: {
        type: Boolean,
        default: false,
        index: true
    },

    banReason: {
        type: String,
        maxlength: 500
    }
    
}, { timestamps: true });

userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);