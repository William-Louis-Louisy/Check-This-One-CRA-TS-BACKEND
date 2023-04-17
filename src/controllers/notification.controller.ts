import { dataSource } from "../app";
import { User } from "../models/user.model";
import { NextFunction, Request, Response } from "express";
import { Notification } from "../models/notification.model";

const NotificationController = {
  // GET UNSEEN NOTIFICATIONS
  getUnseenNotifications: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.params.user_id;
      const notificationRepository = dataSource.getRepository(Notification);

      const unseenNotifications = await notificationRepository.find({
        where: { user: { id: parseInt(userId) }, seen: false },
      });

      return res.status(200).json({ notifications: unseenNotifications });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // UPDATE NOTIFICATION
  updateNotification: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.params.user_id;
      const notificationId = req.params.notif_id;

      const notificationRepository = dataSource.getRepository(Notification);
      const userRepository = dataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: parseInt(userId) },
      });

      const notification = await notificationRepository.findOne({
        where: { id: parseInt(notificationId) },
      });

      if (!user || !notification) {
        return res
          .status(400)
          .json({ message: "User or notification not found" });
      }

      notification.seen = true;
      notification.updated_at = new Date();

      await notificationRepository.save(notification);

      return res.status(200).json({ message: "Notification updated" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

export default NotificationController;
