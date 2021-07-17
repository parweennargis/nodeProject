const Notification = require('../models/notification');

exports.createNotification = async (data) => {
    const notification = new Notification(data)
    return notification.save();
};

exports.getNotificatons = async (req, res, next) => {
    return Notification.find({ userId: req.user._id });
};