import ListController from "../controllers/list.controller";

const express = require("express");
const listRouter = express.Router();

// CREATE A LIST
listRouter.post("/list/create/:id", ListController.createList);

// GET ALL LISTS
listRouter.get("/lists/getAll", ListController.getAllLists);

// GET LISTS BY USER ID
listRouter.get("/lists/getByUserId/:id", ListController.getListsByUserId);

// GET LIST BY ID
listRouter.get("/list/getById/:id", ListController.getListById);

// ADD CONTENT TO A LIST
listRouter.put("/:id/content", ListController.addContentToList);

// GET ALL CONTENT FROM A LIST
listRouter.get("/:id/content", ListController.getAllContentFromList);

// DELETE A CONTENT BY ID
listRouter.delete("/content/:id", ListController.deleteContentById);

// DELETE A LIST BY ID
listRouter.delete("/list/:id", ListController.deleteListById);

// DELETE A CONTENT FROM A LIST
listRouter.delete(
  "/:id/content/:contentId",
  ListController.deleteContentFromListById
);

export default listRouter;
