import UserController from "../controllers/user.controller";

const express = require("express");
const userRouter = express.Router();

// CREATE USER
userRouter.post("/register", UserController.createUser);

// LOGIN USER
userRouter.post("/login", UserController.loginUser);

// LOGOUT USER
userRouter.get("/logout", UserController.logoutUser);

// UPDATE A USER BY ID
userRouter.put("/update/:id", UserController.updateUser);

// GET A USER BY ID
userRouter.get("/user/:id", UserController.getUser);

// GET LISTS LIKED BY A USER
userRouter.get("/user/:id/lists", UserController.getListsLikedByUser);

// GET ALL USERS
userRouter.get("/users/getAll", UserController.getAllUsers);

// CHECK USERNAME AVAILABILITY
userRouter.get(
  "/users/check-username-availability",
  UserController.checkUsernameAvailability
);

// CHECK EMAIL AVAILABILITY
userRouter.get(
  "/users/check-email-availability",
  UserController.checkEmailAvailability
);

// GET ALL BADGES OF A USER
userRouter.get("/user/:id/badges", UserController.getAllBadgesOfUser);

// GET USER STATS
userRouter.get("/user/:id/stats", UserController.getUserStats);

// RESET USER PASSWORD
userRouter.post("/reset-password", UserController.requestResetPassword);

// RESET USER PASSWORD
userRouter.post("/reset-password/confirm", UserController.resetPassword);

export default userRouter;
