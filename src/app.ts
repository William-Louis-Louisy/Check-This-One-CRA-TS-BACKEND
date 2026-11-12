import cors from "cors";
import express from "express";
import { getAllowedOrigins } from "./config/cors";
import cookieParser from "cookie-parser";
import { setupRoutes } from "./routes";
import { dataSource } from "./database/data-source";
export { dataSource } from "./database/data-source";
import cron from "node-cron";
import { deleteOldNotifications } from "./services/notification.services";
import { checkAllBadgesForAllUsers } from "./services/badge.services";
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.set("x-powered-by", false);
app.set("trust proxy", true);
app.enable("trust proxy");

// MIDDLEWARE
const allowedOrigins = getAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.has(origin)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ROUTES
setupRoutes(app);

dataSource
  .initialize()
  .then(async () => {
    console.log("🟢 Connected to MySQL database!");
    app.listen(port, () => {
      console.log(`🟢 Server started on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("🔴 Error connecting to MySQL database!", error);
  });

// Run the notification deletion service every day at 00:00
cron.schedule("0 0 * * *", deleteOldNotifications);
