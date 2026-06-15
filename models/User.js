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

    lastLogin: Date,

    devices: [{
        deviceId: String,
        userAgent: String,
        ip: String,
        lastUsed: Date
    }],

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
    }

}, { timestamps: true });

userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);