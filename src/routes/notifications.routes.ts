import NotificationController from "../controllers/notification.controller";

const express = require("express");
const notificationRouter = express.Router();

// GET UNSEEN NOTIFICATIONS
notificationRouter.get(
  "/user/:user_id/notifications/unseen",
  NotificationController.getUnseenNotifications
);

// UPDATE NOTIFICATION
notificationRouter.put(
  "/user/:user_id/notification/:notif_id",
  NotificationController.updateNotification
);

export default notificationRouter;
