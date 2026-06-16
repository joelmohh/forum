const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    // hash
    code: {
        type: String,
        required: true
    },

    validated: {
        type: Boolean,
        default: false
    },

    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

otpSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('Otp', otpSchema);