import { NextFunction, Request, Response } from "express";
import { Badge } from "../models/badge.model";
import { dataSource } from "../app";

const BadgeController = {
  // CREATE BADGE
  createBadge: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get badge data from request body
      const { name, name_en, description, description_en, icon } = req.body;
      if (!name || !name_en || !description || !description_en || !icon) {
        return res.status(400).json({ message: "Missing badge data" });
      }

      // Create badge
      const badge = new Badge();
      badge.name = name;
      badge.name_en = name_en;
      badge.description = description;
      badge.description_en = description_en;
      badge.icon = icon;

      // Save badge
      const badgeRepository = dataSource.getRepository(Badge);
      const savedBadge = await badgeRepository.save(badge);

      return res.status(200).json({ badge: savedBadge });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL BADGES
  getAllBadges: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const badgeRepository = dataSource.getRepository(Badge);
      const badges = await badgeRepository.find();

      return res.status(200).json({ badges });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // DELETE BADGE
  deleteBadge: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const badge_id = req.params.id;
      if (!badge_id) {
        return res.status(400).json({ message: "Missing badge id" });
      }

      const badgeRepository = dataSource.getRepository(Badge);
      const badge = await badgeRepository.findOne({
        where: { id: parseInt(badge_id) },
      });
      if (!badge) {
        return res.status(400).json({ message: "Badge not found" });
      }

      await badgeRepository.remove(badge);

      return res.status(200).json({ message: "Badge deleted" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // UPDATE BADGE
  updateBadge: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const badge_id = req.params.id;
      if (!badge_id) {
        return res.status(400).json({ message: "Missing badge id" });
      }

      const badgeRepository = dataSource.getRepository(Badge);
      const badge = await badgeRepository.findOne({
        where: { id: parseInt(badge_id) },
      });
      if (!badge) {
        return res.status(400).json({ message: "Badge not found" });
      }

      const { name, name_en, description, description_en, icon, id } = req.body;
      if (
        !name ||
        !name_en ||
        !description ||
        !description_en ||
        !icon ||
        !id
      ) {
        return res.status(400).json({ message: "Missing badge data" });
      }

      badge.id = id;
      badge.name = name;
      badge.name_en = name_en;
      badge.description = description;
      badge.description_en = description_en;
      badge.icon = icon;

      const savedBadge = await badgeRepository.save(badge);

      return res.status(200).json({ badge: savedBadge });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // DROP TABLE IF EXISTS `badge`;
  dropBadgeTable: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const badgeRepository = dataSource.getRepository(Badge);
      await badgeRepository.query("DROP TABLE IF EXISTS `badge`");

      return res.status(200).json({ message: "Badge table dropped" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

export default BadgeController;
