import BadgeController from "../controllers/badge.controller";

const express = require("express");
const badgeRouter = express.Router();

// CREATE BADGE
badgeRouter.post("/badge", BadgeController.createBadge);

// GET ALL BADGES
badgeRouter.get("/badges", BadgeController.getAllBadges);

// DELETE BADGE
badgeRouter.delete("/badge/:id", BadgeController.deleteBadge);

// UPDATE BADGE
badgeRouter.put("/badge/:id", BadgeController.updateBadge);

// CHECK BADGES FOR ALL USERS
badgeRouter.get("/check-badges", BadgeController.badgesVerification);

// DROP BADGE TABLE
// badgeRouter.get("/drop-badge-table", BadgeController.dropBadgeTable);

export default badgeRouter;
