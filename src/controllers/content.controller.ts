import { dataSource } from "../app";
import { FindManyOptions } from "typeorm";
import { User } from "../models/user.model";
import { List } from "../models/list.model";
import { Content } from "../models/content.model";
import { NextFunction, Request, Response } from "express";

const contentController = {
  // SET CONTENT TO SEEN
  setContentSeen: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentId = parseInt(req.params.contentId);
      const userId = parseInt(req.params.userId);

      return await dataSource.transaction(
        async (transactionalEntityManager) => {
          const userRepository = transactionalEntityManager.getRepository(User);
          const contentRepository =
            transactionalEntityManager.getRepository(Content);

          const [user, content] = await Promise.all([
            userRepository.findOne({
              where: { id: userId },
              relations: ["seen_content"],
            }),
            contentRepository.findOne({
              where: { id: contentId },
              relations: ["seen_by"],
            }),
          ]);

          if (
            user?.seen_content?.filter((c) => c.id === content.id).length > 0
          ) {
            content.seen -= 1;
            user.seen_content = user.seen_content.filter(
              (c) => c.id !== content.id
            );

            await Promise.all([
              userRepository.save(user),
              contentRepository.save(content),
            ]);

            return res
              .status(200)
              .json({ message: "Content removed from seen" });
          }
          content.seen += 1;
          user.seen_content.push(content);

          await Promise.all([
            userRepository.save(user),
            contentRepository.save(content),
          ]);

          return res.status(200).json({ message: "Content added to seen" });
        }
      );
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

export default contentController;
