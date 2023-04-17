import BadgeController from "../controllers/badge.controller";

const express = require("express");
const badgeRouter = express.Router();

// CREATE BADGE
badgeRouter.post("/badge", BadgeController.createBadge);

export default badgeRouter;
