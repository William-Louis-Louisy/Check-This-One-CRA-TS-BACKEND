import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { dataSource } from "../app";
import { NextFunction, Request, Response } from "express";
import {
  createUserService,
  getListCountByUser,
  getListCountByUserAndType,
  getTotalLikesByUser,
} from "../services/user.services";
import { User } from "../models/user.model";
import { List } from "../models/list.model";

// CREATE TOKEN
const maxAge = 3 * 24 * 60 * 60; // 3 days
const createToken = (id: number, user_name: string) => {
  return jwt.sign({ id, user_name }, process.env.JWT_SECRET as string, {
    expiresIn: maxAge,
  });
};

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
      const { avatar, country, city, catchline, introduction, username } =
        req.body;

      user.avatar = avatar;
      user.country = country;
      user.city = city;
      user.catchline = catchline;
      user.introduction = introduction;
      user.user_name = username;
      await dataSource.getRepository(User).save(user);
      return res.status(200).json({ message: "User updated" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET USER BY ID
  getUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // GET USER ID FROM PARAMS
      const id = parseInt(req.params.id);
      // FIND USER IN DATABASE
      const user = await dataSource
        .getRepository(User)
        .findOne({ where: { id: id }, relations: ["seen_content"] });
      // FIND ALL LISTS THAT CONTAIN USER ID
      const userLists = await dataSource.getRepository(List).find({
        where: { creator_id: id, creator: { id } },
      });
      // FIND ALL LISTS THAT CONTAIN USER ID and IS PUBLIC
      const publicUserLists = await dataSource.getRepository(List).find({
        where: { creator_id: id, creator: { id }, privacy: "public" },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // RETURN USER WITHOUT PASSWORD AND ID
      return res.status(200).json({
        user: {
          id: user.id,
          user_name: user.user_name,
          avatar: user.avatar,
          country: user.country,
          city: user.city,
          catchline: user.catchline,
          introduction: user.introduction,
          email: user.email,
          listsCount: userLists.length,
          publicListsCount: publicUserLists.length,
          seenContentCount: user.seen_content.length,
          seenContent: user.seen_content,
        },
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // LOGIN USER
  loginUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the username and password from the request body
      const { email, password } = req.body;
      // Find the user matching the user mail
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
      return res.status(200).json({
        user: {
          id: user.id,
          user_name: user.user_name,
          avatar: user.avatar,
          country: user.country,
          city: user.city,
          catchline: user.catchline,
          introduction: user.introduction,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // LOGOUT USER
  logoutUser: async (req: Request, res: Response, next: NextFunction) => {
    return res
      .clearCookie("access_token", { domain: ".localhost" })
      .status(200)
      .json({ status: 200, message: "Logout successful" });
  },

  // GET LISTS LIKED BY A USER
  getListsLikedByUser: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Get pagination options from query
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

      const userId = parseInt(req.params.id);
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: [
          "liked_lists",
          "liked_lists.content",
          "liked_lists.content.seen_by",
        ],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lists = user.liked_lists;

      // Paginate the lists
      const total = lists.length;
      const totalPage = paginate ? Math.ceil(total / limit) : 1;

      const paginatedLists = paginate
        ? lists.slice((page - 1) * limit, page * limit)
        : lists;

      // Generate qrcodes for each list
      const listsWithQRCodes = await Promise.all(
        paginatedLists.map(async (list) => {
          const url = `https://checkthisone.vercel.app/listDetails/${list.id}`;
          const qrCodeDataURL = await generateQRCodeDataURL(url);
          return { ...list, qrCodeDataURL };
        })
      );

      return res
        .status(200)
        .json({ lists: listsWithQRCodes, total: total, totalPage: totalPage });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET ALL USERS
  getAllUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRepository = dataSource.getRepository(User);
      const users = await userRepository.find({
        relations: ["liked_lists", "lists"],
      });
      return res.status(200).json({ users });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // CHECK USERNAME AVAILABILITY
  checkUsernameAvailability: async (req: Request, res: Response) => {
    try {
      const { user_name } = req.query;

      if (!user_name) {
        return res.status(400).json({ message: "No username provided" });
      }

      const userRepository = dataSource.getRepository(User);
      let existingUser;

      if (user_name) {
        existingUser = await userRepository.findOne({
          where: { user_name: user_name as string },
        });
      }

      if (existingUser) {
        return res.status(200).json({ available: false });
      } else {
        return res.status(200).json({ available: true });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // CHECK EMAIL AVAILABILITY
  checkEmailAvailability: async (req: Request, res: Response) => {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ message: "No email provided" });
      }

      const userRepository = dataSource.getRepository(User);
      let existingUser;

      if (email) {
        existingUser = await userRepository.findOne({
          where: { email: email as string },
        });
      }

      if (existingUser) {
        return res.status(200).json({ available: false });
      } else {
        return res.status(200).json({ available: true });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // GET ALL BADGES OF A USER
  getAllBadgesOfUser: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ["unlocked_badges", "unlocked_badges.badge"],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const badges = user.unlocked_badges.map(
        (unlockedBadge) => unlockedBadge.badge
      );

      return res.status(200).json({ badges });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // GET USER STATS
  getUserStats: async (req: Request, res: Response) => {
    try {
      // Get user id from request
      const userId = parseInt(req.params.id);

      // Get list count
      const listCount = await getListCountByUser(userId);

      // Get list count by category
      const moviesListCount = await getListCountByUserAndType(userId, "movie");
      const showsListCount = await getListCountByUserAndType(userId, "show");
      const podcastsListCount = await getListCountByUserAndType(
        userId,
        "podcast"
      );
      const youtubesListCount = await getListCountByUserAndType(
        userId,
        "youtube"
      );
      const mixedListCount = await getListCountByUserAndType(userId, "mixed");

      // Get likes count
      const likesCount = await getTotalLikesByUser(userId);

      return res.status(200).json({
        listCount,
        moviesListCount,
        showsListCount,
        podcastsListCount,
        youtubesListCount,
        mixedListCount,
        likesCount,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

export default UserController;
