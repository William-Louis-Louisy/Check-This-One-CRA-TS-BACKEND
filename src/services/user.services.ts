import crypto from "crypto";
import jwt from "jsonwebtoken";
import { dataSource } from "../app";
import { List } from "../models/list.model";
import { User } from "../models/user.model";
import sgMail from "../middlewares/NodeMailerConfig";
require("dotenv").config();

export const createUserService = async (datas: any) => {
  try {
    // Create new user
    const user = new User();
    user.user_name = datas.user_name;
    user.email = datas.email;
    user.password = datas.password;

    // Save user to database
    await dataSource.getRepository(User).save(user);

    return user;
  } catch (error) {
    throw error;
  }
};

export const getListCountByUser = async (user_id: number) => {
  try {
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: user_id },
      relations: ["lists"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user.lists.length;
  } catch (error) {
    throw error;
  }
};

export const getListCountByUserAndType = async (
  user_id: number,
  type: string
) => {
  try {
    const listRepository = dataSource.getRepository(List);
    const ListCount = await listRepository.count({
      where: { creator_id: user_id, type: type },
    });

    return ListCount;
  } catch (error) {
    throw error;
  }
};

export const getTotalLikesByUser = async (user_id: number) => {
  try {
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: user_id },
      relations: ["lists"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const totalLikes = user.lists.reduce((acc, list) => acc + list.likes, 0);

    return totalLikes;
  } catch (error) {
    throw error;
  }
};

export const generateResetPasswordToken = () => {
  return new Promise<string>((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        const token = buffer.toString("hex");
        resolve(token);
      }
    });
  });
};

export const setResetPasswordToken = async (email: string) => {
  try {
    // Find the user with the provided email
    const user = await dataSource
      .getRepository(User)
      .findOne({ where: { email: email } });

    // If the user is not found, throw an error
    if (!user) {
      throw new Error("User not found");
    }

    // Generate a reset password token
    const reset_password_token = await generateResetPasswordToken();

    // Set the token and expiration date (1 hour from now)
    user.reset_password_token = reset_password_token;
    user.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour

    // Save the updated user to the database
    await dataSource.getRepository(User).save(user);

    return { user, reset_password_token };
  } catch (error) {
    throw error;
  }
};

export const sendResetPasswordEmail = async (
  user: User,
  token: string,
  lang: string
) => {
  try {
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    let msg;

    if (lang === "fr") {
      msg = {
        to: user.email,
        from: process.env.EMAIL_USER,
        subject: "Réinitialisez votre mot de passe",
        text: `Bonjour ${user.user_name}! Vous recevez cet e-mail parce que vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte. Veuillez cliquer sur le lien suivant ou le coller dans votre navigateur pour terminer la procédure:\n\n${resetPasswordUrl}\n\nSi vous n'avez pas fait cette demande, veuillez ignorer cet e-mail et votre mot de passe restera inchangé.`,
      };
    } else {
      msg = {
        to: user.email,
        from: process.env.EMAIL_USER,
        subject: "Reset your password",
        text: `Hi ${user.user_name}! You are receiving this email because you (or someone else) have requested the reset of the password for your account. Please click on the following link, or paste this into your browser to complete the process:\n\n${resetPasswordUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
      };
    }

    // Send the email
    await sgMail.send(msg);
  } catch (error) {
    throw error;
  }
};

export const verifyResetPasswordToken = async (token: string) => {
  try {
    const user = await dataSource
      .getRepository(User)
      .findOne({ where: { reset_password_token: token } });

    if (!user) {
      return null;
    }

    const now = new Date();
    if (
      !user.reset_password_token ||
      !user.reset_password_expires ||
      user.reset_password_expires < now
    ) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
};
