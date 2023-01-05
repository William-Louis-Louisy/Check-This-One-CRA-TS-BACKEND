import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { dataSource } from "../app";
import { NextFunction, Request, Response } from "express";
import { createUserService } from "../services/user.services";
import { User } from "../models/user.model";

// CREATE TOKEN
const maxAge = 3 * 24 * 60 * 60; // 3 days
const createToken = (id: number, user_name: string) => {
  return jwt.sign({ id, user_name }, process.env.JWT_SECRET as string, {
    expiresIn: maxAge,
  });
};

const UserController = {
  // CREATE USER
  createUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // VALIDATE USER INPUT
      const { user_name, email, password } = req.body;
      if (!user_name || !email || !password) {
        return res.status(400).json({ message: "Please fill all fields" });
      }
      const user = await createUserService(req.body);
      // CREATE TOKEN
      const token = createToken(user.id, user.user_name);

      res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        domain: ".localhost",
      });

      return res.status(200).json({ user, token });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // UPDATE USER BY ID
  updateUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const user = await dataSource
        .getRepository(User)
        .findOne({ where: { id: id } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { avatar, country, city, catchline, introduction } = req.body;
      user.avatar = avatar;
      user.country = country;
      user.city = city;
      user.catchline = catchline;
      user.introduction = introduction;
      await dataSource.getRepository(User).save(user);
      return res.status(200).json({ message: "User updated" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET USER BY ID
  getUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const user = await dataSource
        .getRepository(User)
        .findOne({ where: { id: id } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json({ user });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET USER AVATAR BY ID
  getUserAvatar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const user = await dataSource
        .getRepository(User)
        .findOne({ where: { id: id } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Convert the avatar buffer to a base64 string
      const avatarBase64 = user.avatar.toString("base64");
      // Return the avatar as a base64 string
      return res.status(200).json({ avatar: avatarBase64 });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // LOGIN USER
  loginUser: async (req: Request, res: Response, next: NextFunction) => {
    // Get the username and password from the request body
    const { email, password } = req.body;
    // Find the user matching the username
    const user = await dataSource
      .getRepository(User)
      .findOne({ where: { email: email } });
    // If the user is not found, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // If the user is found, compare the password using bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    // If the password doesn't match, return an error
    if (!passwordMatch) {
      return res.status(401).json({ message: "Password is incorrect" });
    }
    // If the password matches, generate a JWT
    const token = createToken(user.id, user.user_name);
    // Send the JWT back to the client
    res.cookie("jwt", token, { httpOnly: true });
    res.cookie("user", user, { httpOnly: true });
    return res.status(200).json({ user, token });
  },

  // LOGOUT USER
  logoutUser: async (req: Request, res: Response, next: NextFunction) => {
    res
      .clearCookie("access_token", { domain: ".localhost" })
      .status(200)
      .json({ status: 200, message: "Logout successful" });
  },
};

export default UserController;
