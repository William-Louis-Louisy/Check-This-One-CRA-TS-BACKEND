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
};

export default BadgeController;
