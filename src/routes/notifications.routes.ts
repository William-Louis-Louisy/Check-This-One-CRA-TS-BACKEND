import NotificationController from "../controllers/notification.controller";
import { authenticate, requireSelf } from "../middlewares/authorization";

const express = require("express");
const notificationRouter = express.Router();

// GET UNSEEN NOTIFICATIONS
notificationRouter.get(
  "/user/:user_id/notifications/unseen",
  authenticate,
  requireSelf("user_id"),
  NotificationController.getUnseenNotifications
);

// UPDATE NOTIFICATION
notificationRouter.put(
  "/user/:user_id/notification/:notif_id",
  authenticate,
  requireSelf("user_id"),
  NotificationController.updateNotification
);

export default notificationRouter;
