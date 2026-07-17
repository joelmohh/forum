const User = require("../../models/User");

async function log(userId, type, req) {
    await User.updateOne(
        { _id: userId },
        {
            $push: {
                securityActivity: {
                    $each: [{
                        type,
                        ipAddress: req.ip,
                        userAgent: req.headers["user-agent"] || "Unknown",
                        timestamp: new Date()
                    }],
                    $position: 0,
                    $slice: 100
                }
            }
        }
    );
}

module.exports = log;