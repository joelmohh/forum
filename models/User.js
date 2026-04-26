const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
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

    profilePicture: String,

    bio: {
        type: String,
        maxlength: 500
    }

}, { timestamps: true });

userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);