import ListController from "../controllers/list.controller";

const express = require("express");
const listRouter = express.Router();

// CREATE A LIST
listRouter.post("/list/create/:id", ListController.createList);

// GET ALL LISTS
listRouter.get("/lists/getAll", ListController.getAllLists);

// GET ALL PUBLIC LISTS
listRouter.get("/lists/getAllPublic", ListController.getAllPublicLists);

// GET LISTS BY USER ID
listRouter.get("/lists/getByUserId/:id", ListController.getListsByUserId);

// GET LIST BY ID
listRouter.get("/list/getById/:id/user/:userId", ListController.getListById);

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

// GET ALL LISTS THAT CONTAIN A PROVIDER ID
listRouter.get(
  "/lists/getByProviderId/:id",
  ListController.getAllListsByProviderId
);

// GET ALL LISTS COUNT THAT CONTAIN A PROVIDER ID
listRouter.get(
  "/lists/getCountByProviderId/:id",
  ListController.getAllListsCountByProviderId
);

// GET ALL LISTS FILTERED BY TITLE OR CREATOR ID
listRouter.post(
  "/lists/getAllListsFiltered",
  ListController.getAllListsFiltered
);

// UPDATE LIST BY ID
listRouter.put("/list/update/:id", ListController.updateListById);

// ADD LIKE TO A LIST BY ID AND USER ID
listRouter.put("/list/:listId/like/:userId", ListController.addLikeToList);

// GET USERS THAT LIKED A LIST
listRouter.get("/list/:id/likes", ListController.getUsersThatLikedList);

// GET USERS WITH MOST LIKES ON THEIR LISTS
listRouter.get("/lists/getMostLiked", ListController.getMostLikedLists);

// GET TOTAL LIKES
listRouter.get("/lists/getTotalLikes", ListController.getTotalLikes);

export default listRouter;
