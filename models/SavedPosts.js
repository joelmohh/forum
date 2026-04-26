const mongoose = require('mongoose');
const bookmarkSchema = new mongoose.Schema({
    user: { type: ObjectId, ref: 'User', index: true },
    post: { type: ObjectId, ref: 'Post', index: true }

}, { timestamps: true });

bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('SavedPost', bookmarkSchema);