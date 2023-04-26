import { Application } from "express";
import contentRouter from "./routes/content.routes";
import listRouter from "./routes/list.routes";
import userRouter from "./routes/user.routes";
import badgeRouter from "./routes/badge.routes";
import notificationRouter from "./routes/notifications.routes";
import contactRouter from "./routes/contact.routes";

export function setupRoutes(app: Application) {
  app.use(userRouter);
  app.use(listRouter);
  app.use(contentRouter);
  app.use(badgeRouter);
  app.use(notificationRouter);
  app.use(contactRouter);
}
