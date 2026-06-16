const mongoose = require('mongoose');
const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  tokenHash: {
    type: String,
    required: true,
    unique: true
  },

  deviceId: {
    type: String,
    required: true,
    index: true
  },

  userAgent: String,
  ip: String,

  expiresAt: {
    type: Date,
    required: true
  },

  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: Date
});
module.exports = mongoose.model('Session', sessionSchema);