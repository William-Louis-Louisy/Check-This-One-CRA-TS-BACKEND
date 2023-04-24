import crypto from "crypto";
import { dataSource } from "../app";
import { List } from "../models/list.model";
import { User } from "../models/user.model";
import transporter from "../middlewares/NodeMailerConfig";
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

export const sendResetPasswordEmail = async (user: User, token: string) => {
  try {
    console.log("USER : ", user, "TOKEN : ", token);
    console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Reset your password",
      text: `Hi ${user.user_name}! You are receiving this email because you (or someone else) have requested the reset of the password for your account. Please click on the following link, or paste this into your browser to complete the process:\n\n${resetPasswordUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw error;
  }
};
