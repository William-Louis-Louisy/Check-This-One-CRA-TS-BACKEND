import { dataSource } from "../app";
import { List } from "../models/list.model";
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
