import { dataSource } from "../app";
import { User } from "../models/user.model";

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
