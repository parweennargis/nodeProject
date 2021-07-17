const Notification = require('../models/notification');

exports.createNotification = async (data) => {
    const notification = new Notification(data)
    return notification.save();
};

exports.getNotificatons = async (req, res, next) => {
    const notifications = await Notification.find({ userId: req.user._id }).exec();

    return notifications;
};