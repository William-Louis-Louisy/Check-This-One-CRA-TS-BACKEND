import { dataSource } from "../app";
import { Tag } from "../models/tag.model";
import { FindManyOptions } from "typeorm";
import { User } from "../models/user.model";
import { List } from "../models/list.model";
import { Content } from "../models/content.model";
import { NextFunction, Request, Response } from "express";
import { addContentToListService } from "../services/list.services";
const QRCode = require("qrcode");

async function generateQRCodeDataURL(url: string) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(url);
    return qrCodeDataURL;
  } catch (err) {
    console.error("Erreur lors de la génération du QR Code", err);
    return null;
  }
}

const listController = {
  // CREATE A LIST
  createList: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user id from url
      const userId = req.params.id;

      // Get the tag repository
      const tagRepository = dataSource.getRepository(Tag);

      // Get the user repository
      const userRepository = dataSource.getRepository(User);

      // Get the user
      const user = await userRepository.findOne({
        where: { id: parseInt(userId) },
      });

      // Create an empty array for tags
      const tagsArray: Tag[] = [];

      // Get the list data from the request body
      const { title, description, tags } = req.body;
      if (!title || !description || !tags) {
        return res.status(400).json({ message: "Please fill all fields" });
      }
      const list = new List();
      list.title = title;
      list.description = description;
      list.privacy = "public";
      list.creation_date = new Date();
      list.creator_id = parseInt(userId);
      list.creator = user;
      list.likes = 0;
      // For each tag in the request body, check if it exists in the database
      for (const tag of tags) {
        const existingTag = await tagRepository.findOne({
          where: { name: tag.name },
        });
        if (existingTag) {
          tagsArray.push(existingTag);
        } else {
          const newTag = new Tag();
          newTag.name = tag.name;
          newTag.name_fr = tag.name_fr;

          await tagRepository.save(newTag);
          tagsArray.push(newTag);
        }
      }

      // Add the tags to the list
      list.tags = tagsArray;

      await dataSource.getRepository(List).save(list);
      return res.status(200).json({ message: "List created" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL LISTS
  getAllLists: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lists = await dataSource.getRepository(List).find({
        relations: ["liked_by", "tags"],
        select: { liked_by: { id: true, user_name: true, avatar: true } },
      });
      return res.status(200).json({ lists });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL LIST WHERE PRIVACY IS PUBLIC WITH SEARCH BY TITLE
  getAllPublicLists: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const lists = await dataSource.getRepository(List).find({
        where: { privacy: "public" },
        relations: ["liked_by", "tags"],
        select: { liked_by: { id: true, user_name: true, avatar: true } },
      });
      return res.status(200).json({ lists });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET LISTS BY USER ID
  getListsByUserId: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user id from url
      const id = parseInt(req.params.id);

      // Get pagination options from query parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const page = parseInt(req.query.page as string) || 1;
      const paginate = req.query.paginate !== "false";
      const validLimits = [10, 20, 50, 100];

      // Validate the limit value
      if (!validLimits.includes(limit) && paginate) {
        return res.status(400).json({
          message:
            "Invalid limit value. It should be one of these values: 10, 20, 50, 100.",
        });
      }

      const lists: FindManyOptions<List> = {
        where: { creator_id: id },
        relations: ["liked_by", "tags", "content", "content.seen_by"],
        select: { liked_by: { id: true, user_name: true, avatar: true } },
        take: paginate ? limit : undefined,
        skip: paginate ? (page - 1) * limit : undefined,
        order: { creation_date: "DESC" },
      };

      const [results, total] = await dataSource
        .getRepository(List)
        .findAndCount(lists);

      const totalPages = paginate ? Math.ceil(total / limit) : 1;

      // Generate qrcodes for each list
      const listsWithQRCodes = await Promise.all(
        results.map(async (list) => {
          const url = `https://checkthisone.vercel.app/listDetails/${list.id}`;
          const qrCodeDataURL = await generateQRCodeDataURL(url);
          return { ...list, qrCodeDataURL };
        })
      );

      return res
        .status(200)
        .json(
          paginate
            ? { results: listsWithQRCodes, total, page, totalPages }
            : { results: listsWithQRCodes }
        );
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET LIST BY ID
  getListById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const list = await dataSource.getRepository(List).findOne({
        where: { id: id },
        relations: ["liked_by", "tags"],
        select: { liked_by: { id: true, user_name: true, avatar: true } },
      });

      // Generate qrcode for the list
      const url = `https://checkthisone.vercel.app/listDetails/${list.id}`;
      const qrCodeDataURL = await generateQRCodeDataURL(url);
      const listWithQRCodes = { ...list, qrCodeDataURL };

      return res.status(200).json({ list: listWithQRCodes });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // ADD CONTENT TO LIST
  addContentToList: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get list id from url
      const listId = parseInt(req.params.id);

      // Get the content data from the request body
      const { provider_id, title, poster_path, type } = req.body;
      if (!provider_id || !title || !poster_path || !type) {
        return res.status(400).json({ message: "Please fill all fields" });
      }

      // Add content to list
      await addContentToListService(listId, req.body);

      return res.status(200).json({ message: "Content added to list" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL CONTENT FROM LIST
  getAllContentFromList: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = parseInt(req.params.id);
      const list = await dataSource
        .getRepository(List)
        .findOne({ where: { id: id } });
      return res.status(200).json({ content: list.content });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // DELETE CONTENT BY ID
  deleteContentById: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const contentId = parseInt(req.params.id);
      const contentRepository = dataSource.getRepository(Content);
      const content = await contentRepository.findOne({
        where: { id: contentId },
      });
      await contentRepository.remove(content);
      return res.status(200).json({ message: "Content deleted" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // DELETE LIST BY ID
  deleteListById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.id);
      const listRepository = dataSource.getRepository(List);
      const list = await listRepository.findOne({ where: { id: listId } });
      await listRepository.remove(list);
      return res.status(200).json({ message: "List deleted" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // DELETE A CONTENT FROM LIST BY ID
  deleteContentFromListById: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const listId = parseInt(req.params.id);
      const contentId = parseInt(req.params.contentId);
      const listRepository = dataSource.getRepository(List);
      const list = await listRepository.findOne({ where: { id: listId } });
      const contentRepository = dataSource.getRepository(Content);
      const content = await contentRepository.findOne({
        where: { id: contentId },
      });
      list.content = list.content.filter((c) => c.id !== content.id);
      await listRepository.save(list);
      return res.status(200).json({ message: "Content deleted from list" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL LISTS THAT CONTAIN A PROVIDER ID
  getAllListsByProviderId: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const providerId = parseInt(req.params.id);
      const lists = await dataSource.getRepository(List).find({
        where: { content: { provider_id: providerId } },
        relations: ["liked_by", "tags"],
        select: { liked_by: { id: true, user_name: true, avatar: true } },
      });
      return res.status(200).json({ lists });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL LISTS COUNT THAT CONTAIN A PROVIDER ID
  getAllListsCountByProviderId: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const providerId = parseInt(req.params.id);
      const lists = await dataSource.getRepository(List).find({
        where: { content: { provider_id: providerId } },
      });
      return res.status(200).json({ count: lists.length });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL LISTS FILTERED BY TITLE, CREATOR ID OR TAGS
  getAllListsFiltered: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const title = req.query.title;
      const creator_id = req.query.creator_id;
      const tags = req.body.tags;

      // Get pagination options from query parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const page = parseInt(req.query.page as string) || 1;
      const paginate = req.query.paginate !== "false";
      const validLimits = [10, 20, 50, 100];

      // Validate the limit value
      if (!validLimits.includes(limit) && paginate) {
        return res.status(400).json({
          message:
            "Invalid limit value. It should be one of these values: 10, 20, 50, 100.",
        });
      }

      const listRepository = dataSource.getRepository(List);
      const lists = await listRepository.find({
        where: { privacy: "public" },
        relations: ["liked_by", "tags", "content", "content.seen_by"],
        select: {
          liked_by: { id: true, user_name: true, avatar: true },
        },
        take: paginate ? limit : undefined,
        skip: paginate ? (page - 1) * limit : undefined,
        order: { creation_date: "DESC" },
      });

      const total = await listRepository.count({
        where: { privacy: "public" },
      });

      const totalPages = paginate ? Math.ceil(total / limit) : 1;

      // Generate qrcodes for each list
      const listsWithQRCodes = await Promise.all(
        lists.map(async (list) => {
          const url = `https://checkthisone.vercel.app/listDetails/${list.id}`;
          const qrCodeDataURL = await generateQRCodeDataURL(url);
          return { ...list, qrCodeDataURL };
        })
      );

      // Filter by title and creator_id and tags
      if (title && creator_id && tags) {
        const filteredLists = listsWithQRCodes.filter((list) => {
          const listTags = list.tags.map((tag) => tag.name);
          return (
            list.title.toLowerCase().includes(title.toString().toLowerCase()) &&
            list.creator_id === parseInt(creator_id.toString()) &&
            tags.every((tag: string) => listTags.includes(tag))
          );
        });
        return res
          .status(200)
          .json({ lists: filteredLists, totalPages: totalPages });
      }

      if (title && creator_id) {
        const filteredLists = listsWithQRCodes.filter(
          (list) =>
            list.title.toLowerCase().includes(title.toString().toLowerCase()) &&
            list.creator_id === parseInt(creator_id.toString())
        );
        return res
          .status(200)
          .json({ lists: filteredLists, totalPages: totalPages });
      }

      if (title && tags) {
        const filteredLists = listsWithQRCodes.filter((list) => {
          const listTags = list.tags.map((tag) => tag.name);
          return (
            list.title.toLowerCase().includes(title.toString().toLowerCase()) &&
            tags.every((tag: string) => listTags.includes(tag))
          );
        });
        return res
          .status(200)
          .json({ lists: filteredLists, totalPages: totalPages });
      }

      if (creator_id && tags) {
        const filteredLists = listsWithQRCodes.filter((list) => {
          const listTags = list.tags.map((tag) => tag.name);
          return (
            list.creator_id === parseInt(creator_id.toString()) &&
            tags.every((tag: string) => listTags.includes(tag))
          );
        });
        return res
          .status(200)
          .json({ lists: filteredLists, totalPages: totalPages });
      }

      if (title) {
        const filteredLists = listsWithQRCodes.filter((list) =>
          list.title.toLowerCase().includes(title.toString().toLowerCase())
        );

        return res
          .status(200)
          .json({ lists: filteredLists, totalPages: totalPages });
      }

      if (creator_id) {
        const filteredLists = listsWithQRCodes.filter(
          (list) => list.creator_id === parseInt(creator_id.toString())
        );
        return res
          .status(200)
          .json({ lists: filteredLists, totalPages: totalPages });
      }

      if (tags) {
        const filteredLists = listsWithQRCodes.filter((list) => {
          const listTags = list.tags.map((tag) => tag.name);
          return tags.every((tag: string) => listTags.includes(tag));
        });
        return res
          .status(200)
          .json({ lists: filteredLists, totalPages: totalPages });
      }

      return res.status(200).json({ listsWithQRCodes, totalPages: totalPages });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // UPDATE LIST BY ID
  updateListById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.id);
      const listRepository = dataSource.getRepository(List);
      const list = await listRepository.findOne({ where: { id: listId } });
      const { title, description, privacy } = req.body;
      if (!title || !description || !privacy) {
        return res.status(400).json({ message: "Please fill all fields" });
      }

      // Get user from creator_id
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: list.creator_id },
      });

      list.title = title;
      list.description = description;
      list.privacy = privacy;
      list.creator = user;

      await listRepository.save(list);
      return res.status(200).json({ message: "List updated" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // ADD A LIKE TO A LIST
  addLikeToList: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.listId);
      const userId = parseInt(req.params.userId);

      return await dataSource.transaction(
        async (transactionalEntityManager) => {
          const userRepository = transactionalEntityManager.getRepository(User);
          const listRepository = transactionalEntityManager.getRepository(List);

          const [user, list] = await Promise.all([
            userRepository.findOne({
              where: { id: userId },
              relations: ["liked_lists"],
            }),
            listRepository.findOne({
              where: { id: listId },
              relations: ["liked_by"],
            }),
          ]);

          if (user?.liked_lists?.filter((l) => l.id === list.id).length > 0) {
            list.likes -= 1;
            user.liked_lists = user.liked_lists.filter((l) => l.id !== list.id);

            await Promise.all([
              listRepository.save(list),
              userRepository.save(user),
            ]);

            return res.status(200).json({ message: "Like removed" });
          }

          list.likes += 1;
          user.liked_lists.push(list);

          await Promise.all([
            listRepository.save(list),
            userRepository.save(user),
          ]);

          return res.status(200).json({ message: "Like added" });
        }
      );
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET USERS THAT LIKED A LIST
  getUsersThatLikedList: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const listId = parseInt(req.params.id);
      const listRepository = dataSource.getRepository(List);
      const list = await listRepository.findOne({
        where: { id: listId },
        relations: ["liked_by"],
        select: { liked_by: { id: true, user_name: true, avatar: true } },
      });
      return res.status(200).json({ users: list.liked_by });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET USERS WITH MOST LIKES ON THEIR LISTS
  getMostLikedLists: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = await dataSource
        .createQueryBuilder()
        .select([
          "user.avatar",
          "user.id",
          "user.user_name",
          "SUM(lists.likes) as total_likes",
        ])
        .from(User, "user")
        .leftJoin("user.lists", "lists")
        .where("lists.privacy = 'public'")
        .groupBy("user.id")
        .orderBy("SUM(lists.likes)", "DESC")
        .take(20)
        .getRawMany();

      return res.status(200).json(query);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET TOTAL LIKES
  getTotalLikes: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = await dataSource
        .createQueryBuilder()
        .select(["SUM(lists.likes) as total_likes"])
        .from(List, "lists")
        .getRawOne();

      return res.status(200).json(query);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};
export default listController;
