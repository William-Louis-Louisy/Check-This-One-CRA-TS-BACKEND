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

export default userRouter;
