import contentController from "../controllers/content.controller";
import { authenticate, requireSelf } from "../middlewares/authorization";

const express = require("express");
const contentRouter = express.Router();

// SET CONTENT TO SEEN
contentRouter.put(
  "/content/:contentId/seen/:userId",
  authenticate,
  requireSelf("userId"),
  contentController.setContentSeen
);

export default contentRouter;
