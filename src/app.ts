import cors from "cors";
import express from "express";
import { DataSource } from "typeorm";
import { join } from "path";
import cookieParser from "cookie-parser";
import "reflect-metadata";
import { setupRoutes } from "./routes";
import cron from "node-cron";
import { deleteOldNotifications } from "./services/notification.services";
import { checkAllBadgesForAllUsers } from "./services/badge.services";
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// DATASOURCE INSTANCE
export const dataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, "./models/*.model{.ts,.js}")],
  synchronize: true,
});

app.set("x-powered-by", false);
app.set("trust proxy", true);
app.enable("trust proxy");

// MIDDLEWARE
app.use(
  cors({
    origin: [
      "*",
      "localhost:3000",
      "http://localhost:3000",
      "212.227.70.139",
      "https://checkthisone.vercel.app",
      "checkthisone.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Origin",
    ],
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
