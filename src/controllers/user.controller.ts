import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { clearSessionCookie, csrfTokenForSession, getSessionJwt, setSessionCookie } from "../middlewares/session";
import { dataSource } from "../app";
import { NextFunction, Request, Response } from "express";
import {
  createUserService,
  sendResetPasswordEmail,
  setResetPasswordToken,
  verifyResetPasswordToken,
} from "../services/user.services";
import { User } from "../models/user.model";
import { List } from "../models/list.model";
import { toAdminUser, toOwnUser, toPublicContent, toPublicUser, toList } from "../dto/api-response.dto";

// CREATE TOKEN
const maxAge = 3 * 24 * 60 * 60; // 3 days
const createToken = (user: User) => {
  return jwt.sign(
    { id: user.id, user_name: user.user_name, sv: user.session_version ?? 0, jti: randomUUID() },
    process.env.JWT_SECRET as string,
    { expiresIn: maxAge }
  );
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

const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
const passwordRegex =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-_=+[\]{}|;:'",.<>?`~])[A-Za-z\d!@#$%^&*()-_=+[\]{}|;:'",.<>?`~]{8,}$/;

const UserController = {
  // CREATE USER
  createUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // VALIDATE USER INPUT
      const { user_name, email, password } = req.body;
      if (!user_name || !email || !password) {
        return res.status(400).json({ message: "Please fill all fields" });
      }
      if (user_name.length < 5 || user_name.length > 16) {
        return res
          .status(400)
          .json({ message: "Username must be between 5 and 16 characters" });
      }
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Invalid password format" });
      }

      // CHECK IF USER_NAME IS ALREADY TAKEN
      const userRepository = dataSource.getRepository(User);
      const userNameExists = await userRepository.findOne({
        where: { user_name: user_name },
      });
      if (userNameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // CHECK IF USER ALREADY EXISTS
      const userExists = await userRepository.findOne({
        where: { email: email },
      });
      if (userExists) {
        return res.status(400).json({ message: "Email already taken" });
      }

      const user = await createUserService(req.body);
      // Registration does not implicitly authenticate a new browser.
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        user: { ...toOwnUser(user), role: "user" },
      });
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

      const isOwner = req.auth?.userId === user.id;
      const canSeeAccount = isOwner || req.auth?.role === "admin";
      return res.status(200).json({
        user: {
          ...toPublicUser(user),
          ...(canSeeAccount ? { email: user.email } : {}),
          ...(isOwner ? { role: user.role } : {}),
          listsCount: canSeeAccount ? userLists.length : publicUserLists.length,
          publicListsCount: publicUserLists.length,
          ...(isOwner
            ? {
                seenContentCount: user.seen_content.length,
                seenContent: user.seen_content.map(toPublicContent),
              }
            : {}),
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
        .createQueryBuilder("user")
        .addSelect("user.password")
        .where("user.email = :email", { email })
        .getOne();
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
      // Credentials remain in an HttpOnly host-only cookie, never JSON.
      const token = createToken(user);
      setSessionCookie(res, token);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        user: toOwnUser(user),
        csrfToken: csrfTokenForSession(token),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // CURRENT SESSION (also used to restore login after a page reload)
  getSession: async (req: Request, res: Response) => {
    const jwt = getSessionJwt(req);
    if (!req.auth || !jwt) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await dataSource.getRepository(User).findOne({
      where: { id: req.auth.userId },
    });
    if (!user) return res.status(401).json({ message: "Authentication required" });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      user: toOwnUser(user),
      csrfToken: csrfTokenForSession(jwt),
    });
  },

  // LOGOUT USER
  logoutUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ message: "Authentication required" });
      }
      // Atomic increment invalidates JWTs issued with an older sv claim.
      const result = await dataSource
        .getRepository(User)
        .increment({ id: req.auth.userId }, "session_version", 1);

      if (result.affected !== 1) {
        return res.status(401).json({ message: "Authentication required" });
      }

      clearSessionCookie(res);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ status: 200, message: "Logout successful" });
    } catch (error) {
      return res.status(500).json({ message: "Unable to invalidate session" });
    }
  },

  // REQUEST RESET PASSWORD
  requestResetPassword: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, lang } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Set the reset password token and expiration date for the user
      const { user, reset_password_token } = await setResetPasswordToken(email);

      // Send an email to the user with the reset password link (implemented in the next step)
      await sendResetPasswordEmail(user, reset_password_token, lang);

      return res.status(200).json({ message: "Reset password email sent" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // RESET PASSWORD
  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res
          .status(400)
          .json({ message: "Token and password are required" });
      }

      const user = await verifyResetPasswordToken(token);

      if (!user) {
        return res.status(400).json({ message: "Invalid token" });
      }

      if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Invalid password format" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      // One atomic UPDATE prevents reusing a reset link and invalidates
      // previously issued access tokens on all devices.
      const result = await dataSource
        .createQueryBuilder()
        .update(User)
        .set({
          password: passwordHash,
          reset_password_token: null,
          reset_password_expires: null,
          session_version: () => "session_version + 1",
        })
        .where(
          "id = :userId AND reset_password_token = :token AND reset_password_expires > NOW()",
          { userId: user.id, token }
        )
        .execute();
      if (result.affected !== 1) {
        return res.status(400).json({ message: "Invalid token" });
      }

      return res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
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
        relations: ["liked_lists", "liked_lists.content", "liked_lists.tags", "liked_lists.liked_by"],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Public profile activity must not disclose private liked lists.
      const canSeeAll = req.auth?.userId === userId || req.auth?.role === "admin";
      const lists = user.liked_lists.filter((list) => canSeeAll || list.privacy === "public");

      // Order the lists by creation date
      const sortedLists = lists.sort((a, b) => {
        return b.creation_date.getTime() - a.creation_date.getTime();
      });

      // Paginate the lists
      const total = sortedLists.length;
      const totalPage = paginate ? Math.ceil(total / limit) : 1;

      const paginatedLists = paginate
        ? sortedLists.slice((page - 1) * limit, page * limit)
        : sortedLists;

      // Generate qrcodes for each list
      const listsWithQRCodes = await Promise.all(
        paginatedLists.map(async (list) => {
          const url = `https://checkthisone.vercel.app/listDetails/${list.id}`;
          const qrCodeDataURL = await generateQRCodeDataURL(url);
          return { ...toList(list), qrCodeDataURL };
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
      return res.status(200).json({ users: users.map(toAdminUser) });
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

      // Avoid leaking private-list activity through public statistics.
      const canSeePrivate =
        req.auth?.userId === userId || req.auth?.role === "admin";
      const lists = await dataSource.getRepository(List).find({
        where: canSeePrivate
          ? { creator_id: userId }
          : { creator_id: userId, privacy: "public" },
      });

      const listCount = lists.length;
      const countType = (type: string): number =>
        lists.filter((list) => list.type === type).length;
      const moviesListCount = countType("movie");
      const showsListCount = countType("show");
      const podcastsListCount = countType("podcast");
      const youtubesListCount = countType("youtube");
      const mixedListCount = countType("mixed");
      const likesCount = lists.reduce((total, list) => total + list.likes, 0);

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
