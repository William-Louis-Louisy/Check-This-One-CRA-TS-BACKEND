import BadgeController from "../controllers/badge.controller";
import { authenticate, requireAdmin } from "../middlewares/authorization";

const express = require("express");
const badgeRouter = express.Router();

// CREATE BADGE
badgeRouter.post("/badge", authenticate, requireAdmin, BadgeController.createBadge);

// GET ALL BADGES
badgeRouter.get("/badges", BadgeController.getAllBadges);

// DELETE BADGE
badgeRouter.delete("/badge/:id", authenticate, requireAdmin, BadgeController.deleteBadge);

// UPDATE BADGE
badgeRouter.put("/badge/:id", authenticate, requireAdmin, BadgeController.updateBadge);

// CHECK BADGES FOR ALL USERS
badgeRouter.get("/check-badges", authenticate, requireAdmin, BadgeController.badgesVerification);

// DROP BADGE TABLE
// badgeRouter.get("/drop-badge-table", BadgeController.dropBadgeTable);

export default badgeRouter;
