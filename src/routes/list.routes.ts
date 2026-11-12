import ListController from "../controllers/list.controller";
import { authenticate, optionalAuthenticate, requireAdmin, requireSelf, requireListOwner, allowListRead } from "../middlewares/authorization";

const express = require("express");
const listRouter = express.Router();

// CREATE A LIST
listRouter.post("/list/create/:id", authenticate, requireSelf("id"), ListController.createList);

// GET ALL LISTS
listRouter.get("/lists/getAll", authenticate, requireAdmin, ListController.getAllLists);

// GET ALL PUBLIC LISTS
listRouter.get("/lists/getAllPublic", ListController.getAllPublicLists);

// GET LISTS BY USER ID
listRouter.get("/lists/getByUserId/:id", optionalAuthenticate, ListController.getListsByUserId);

// GET LIST BY ID
listRouter.get("/list/getById/:id/user/:userId", optionalAuthenticate, allowListRead(), ListController.getListById);

// ADD CONTENT TO A LIST
listRouter.put("/:id/content", authenticate, requireListOwner(), ListController.addContentToList);

// GET ALL CONTENT FROM A LIST
listRouter.get("/:id/content", optionalAuthenticate, allowListRead(), ListController.getAllContentFromList);

// DELETE A CONTENT BY ID
listRouter.delete("/content/:id", authenticate, requireAdmin, ListController.deleteContentById);

// DELETE A LIST BY ID
listRouter.delete("/list/:id", authenticate, requireListOwner(), ListController.deleteListById);

// DELETE A CONTENT FROM A LIST
listRouter.delete(
  "/:id/content/:contentId",
  authenticate,
  requireListOwner(),
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
listRouter.put("/list/update/:id", authenticate, requireListOwner(), ListController.updateListById);

// ADD LIKE TO A LIST BY ID AND USER ID
listRouter.put("/list/:listId/like/:userId", authenticate, requireSelf("userId"), ListController.addLikeToList);

// GET USERS THAT LIKED A LIST
listRouter.get("/list/:id/likes", ListController.getUsersThatLikedList);

// GET USERS WITH MOST LIKES ON THEIR LISTS
listRouter.get("/lists/getMostLiked", ListController.getMostLikedLists);

// GET TOTAL LIKES
listRouter.get("/lists/getTotalLikes", ListController.getTotalLikes);

export default listRouter;
