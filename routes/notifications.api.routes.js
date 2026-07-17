const Router = require('express').Router();
const Notification = require('../models/Notifications');
const { verifyToken } = require('../modules/auth/AuthManager');

// Helper for other parts of the app to call, e.g.
// createNotification(userId, 'reply', '/questions/123', 'João replied to your question')
async function createNotification(userId, type, link, content) {
    const notification = new Notification({ user: userId, type, content, link });
    await notification.save();
    return notification;
}

Router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
        const unreadCount = notifications.filter(n => !n.isRead).length;
        res.json({ data: notifications, unreadCount, ok: true });
    } catch (err) {
        console.error("Error in /notifications route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

Router.post('/:notificationId/read', verifyToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ message: "Notification not found", ok: false });
        }
        if (notification.user.toString() !== res.locals.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to mark this notification as read", ok: false });
        }

        notification.isRead = true;
        await notification.save();
        res.json({ message: "Notification marked as read", ok: true });
    } catch (err) {
        console.error("Error in /notifications/:notificationId/read route:", err);
        res.status(500).json({ message: "Internal server error", ok: false });
    }
});

module.exports = Router;
module.exports.createNotification = createNotification;