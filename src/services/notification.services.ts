import { dataSource } from "../app";
import { User } from "../models/user.model";
import { Notification } from "../models/notification.model";
import { LessThan } from "typeorm";

// CREATE NOTIFICATION
export const createNotification = async (
  user_id: number,
  message: string,
  message_en: string,
  type?: string
) => {
  try {
    const userRepository = dataSource.getRepository(User);
    const notificationRepository = dataSource.getRepository(Notification);

    const user = await userRepository.findOne({
      where: { id: user_id },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const notification = new Notification();
    notification.message = message;
    notification.message_en = message_en;
    notification.seen = false;
    notification.user = user;
    notification.type = type;

    await notificationRepository.save(notification);

    return notification;
  } catch (error) {
    throw error;
  }
};

// DELETE READ NOTIFICATIONS OLDER THAN 30 DAYS
export const deleteOldNotifications = async () => {
  try {
    const notificationRepository = dataSource.getRepository(Notification);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await notificationRepository.delete({
      seen: true,
      updated_at: LessThan(thirtyDaysAgo),
    });

    console.log("Old notifications deleted");
  } catch (error) {
    console.error(
      "Error deleting read notifications older than 30 days:",
      error
    );
  }
};
