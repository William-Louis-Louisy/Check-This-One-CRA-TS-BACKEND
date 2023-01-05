import { Application, Request, Response } from "express";
import listRouter from "./routes/list.routes";
import userRouter from "./routes/user.routes";

export function setupRoutes(app: Application) {
  app.use(userRouter);
  app.use(listRouter);
}
