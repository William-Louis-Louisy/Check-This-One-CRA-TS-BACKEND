import { dataSource } from "../app";
import { NextFunction, Request, Response } from "express";
import { List } from "../models/list.model";
import { addContentToListService } from "../services/list.services";
import { Content } from "../models/content.model";
import { Tag } from "../models/tag.model";

const listController = {
  // CREATE A LIST
  createList: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user id from url
      const userId = req.params.id;

      // Get the tag repository
      const tagRepository = dataSource.getRepository(Tag);

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
      const lists = await dataSource.getRepository(List).find();
      return res.status(200).json({ lists });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET LISTS BY USER ID
  getListsByUserId: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const lists = await dataSource
        .getRepository(List)
        .find({ where: { creator_id: id } });
      return res.status(200).json({ lists });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET LIST BY ID
  getListById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const list = await dataSource
        .getRepository(List)
        .findOne({ where: { id: id } });
      return res.status(200).json({ list });
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
};
export default listController;
