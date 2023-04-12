import { Application, Request, Response } from "express";
import contentRouter from "./routes/content.routes";
import listRouter from "./routes/list.routes";
import userRouter from "./routes/user.routes";
import badgeRouter from "./routes/badge.routes";

export function setupRoutes(app: Application) {
  app.use(userRouter);
  app.use(listRouter);
  app.use(contentRouter);
  app.use(badgeRouter);
}
