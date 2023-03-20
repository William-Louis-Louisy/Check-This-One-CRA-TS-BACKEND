import contentController from "../controllers/content.controller";

const express = require("express");
const contentRouter = express.Router();

// SET CONTENT TO SEEN
contentRouter.put(
  "/content/:contentId/seen/:userId",
  contentController.setContentSeen
);

export default contentRouter;
