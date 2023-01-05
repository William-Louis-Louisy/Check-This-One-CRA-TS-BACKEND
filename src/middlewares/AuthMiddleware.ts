import { User } from "../models/user.model";
import { dataSource } from "../app";

const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports.checkUser = async (req: any, res: any, next: any) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(
      token,
      process.env.JWT_SECRET,
      async (err: any, decodedToken: any) => {
        if (err) {
          res.json({ status: "false", message: "Token is not valid" });
          next();
        } else {
          const user = await dataSource
            .getRepository(User)
            .findOne(decodedToken.id);
          if (user) res.json({ status: "true", user: user.email });
          else res.json({ status: "false", message: "User not found" });
          next();
        }
      }
    );
  } else {
    res.json({ status: "false", message: "Token not found" });
    next();
  }
};
