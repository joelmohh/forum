const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const voteSchema = new mongoose.Schema({
    user: { type: ObjectId, ref: 'User', required: true },
    post: { type: ObjectId, ref: 'Post' },
    comment: { type: ObjectId, ref: 'Comment' },

    value: {
        type: Number,
        enum: [1, -1],
        required: true
    }

}, { timestamps: true });

voteSchema.index({ user: 1, post: 1 }, { unique: true, sparse: true });
voteSchema.index({ user: 1, comment: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Vote', voteSchema);