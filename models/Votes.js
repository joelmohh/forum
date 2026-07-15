const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const voteSchema = new mongoose.Schema({
    user: { type: ObjectId, ref: 'User', required: true },
    question: { type: ObjectId, ref: 'Question' },
    answers: { type: ObjectId, ref: 'Answer' },

    value: {
        type: Number,
        enum: [1, -1],
        required: true
    }

}, { timestamps: true });

voteSchema.index({ user: 1, question: 1 }, { unique: true, sparse: true });
voteSchema.index({ user: 1, answers: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Vote', voteSchema);