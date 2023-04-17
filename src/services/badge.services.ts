import { dataSource } from "../app";
import { Badge } from "../models/badge.model";
import { UnlockedBadge } from "../models/unlockedBadge.model";
import { User } from "../models/user.model";
import { createNotification } from "./notification.services";
import {
  getListCountByUser,
  getListCountByUserAndType,
  getTotalLikesByUser,
} from "./user.services";

// GET BADGE BY ID
export const getBadgeById = async (badge_id: number) => {
  try {
    const badgeRepository = dataSource.getRepository(Badge);
    const badge = await badgeRepository.findOne({
      where: { id: badge_id },
    });

    if (!badge) {
      throw new Error("Badge not found");
    }

    return badge;
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER HAS ALREADY UNLOCKED A BADGE
export const userHasBadge = async (user_id: number, badge_id: number) => {
  try {
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: user_id },
      relations: ["unlocked_badges", "unlocked_badges.badge"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const userHasBadge = user.unlocked_badges.some(
      (unlockedBadge) =>
        unlockedBadge.badge && unlockedBadge.badge.id === badge_id
    );

    return userHasBadge;
  } catch (error) {
    throw error;
  }
};

// ADD AN UNLOCKED BADGE TO A USER
export const addUserBadge = async (user_id: number, badge_id: number) => {
  try {
    const badgeRepository = dataSource.getRepository(Badge);
    const userRepository = dataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: user_id },
      relations: ["unlocked_badges"],
    });
    const badge = await badgeRepository.findOne({
      where: { id: badge_id },
      relations: ["unlocked_badges"],
    });

    if (!user || !badge) {
      throw new Error("User or badge not found");
    }

    const unlockedBadge = new UnlockedBadge();
    unlockedBadge.user = user;
    unlockedBadge.badge = badge;

    const unlockedBadgeRepository = dataSource.getRepository(UnlockedBadge);
    await unlockedBadgeRepository.save(unlockedBadge);

    // Create notification for the user
    const message = `Vous avez débloqué le badge ${badge.name}`;
    const message_en = `You unlocked the badge ${badge.name_en}`;
    const type = "badge";
    await createNotification(user_id, message, message_en, type);

    return unlockedBadge;
  } catch (error) {
    throw error;
  }
};

// UNLOCK A BADGE IF USER HASN'T ALREADY UNLOCKED IT
export const unlockBadge = async (user_id: number, badge_id: number) => {
  const hasBadge = await userHasBadge(user_id, badge_id);

  if (!hasBadge) {
    await addUserBadge(user_id, badge_id);
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE NEWBIE BADGE
export const checkNewbie = async (user_id: number) => {
  try {
    const listCount = await getListCountByUser(user_id);

    if (listCount >= 1) {
      await unlockBadge(user_id, 1);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE INITIATION LISTS BADGE
export const checkInitiationLists = async (user_id: number) => {
  try {
    const listCount = await getListCountByUser(user_id);

    if (listCount >= 10) {
      await unlockBadge(user_id, 2);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE LIST ARTISAN BADGE
export const checkListArtisan = async (user_id: number) => {
  try {
    const listCount = await getListCountByUser(user_id);

    if (listCount >= 50) {
      await unlockBadge(user_id, 3);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE LIST GURU BADGE
export const checkListGuru = async (user_id: number) => {
  try {
    const listCount = await getListCountByUser(user_id);

    if (listCount >= 100) {
      await unlockBadge(user_id, 4);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE PODCAST ADDICT BADGE
export const checkPodcastAddict = async (user_id: number) => {
  try {
    const listCount = await getListCountByUserAndType(user_id, "podcast");

    if (listCount >= 5) {
      await unlockBadge(user_id, 5);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE MOVIE BUFF BADGE
export const checkMovieBuff = async (user_id: number) => {
  try {
    const listCount = await getListCountByUserAndType(user_id, "movie");

    if (listCount >= 5) {
      await unlockBadge(user_id, 6);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE SUPREME BINGE WATCHER BADGE
export const checkSupremeBingeWatcher = async (user_id: number) => {
  try {
    const listCount = await getListCountByUserAndType(user_id, "show");

    if (listCount >= 5) {
      await unlockBadge(user_id, 7);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE YOUTUBER BADGE
export const checkYoutuber = async (user_id: number) => {
  try {
    const listCount = await getListCountByUserAndType(user_id, "youtube");

    if (listCount >= 5) {
      await unlockBadge(user_id, 8);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE BUDDING INFLUENCER BADGE
export const checkBuddingInfluencer = async (user_id: number) => {
  try {
    const totalLikes = await getTotalLikesByUser(user_id);

    if (totalLikes >= 20) {
      await unlockBadge(user_id, 9);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE MASTER OF INFLUENCE BADGE
export const checkMasterOfInfluence = async (user_id: number) => {
  try {
    const totalLikes = await getTotalLikesByUser(user_id);

    if (totalLikes >= 50) {
      await unlockBadge(user_id, 10);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK IF USER MEETS THE REQUIREMENTS TO UNLOCK THE LEGENDARY INFLUENCER BADGE
export const checkLegendaryInfluencer = async (user_id: number) => {
  try {
    const totalLikes = await getTotalLikesByUser(user_id);

    if (totalLikes >= 100) {
      await unlockBadge(user_id, 11);
    }
  } catch (error) {
    throw error;
  }
};

// CHECK BADGES FOR ALL USERS
export const checkAllBadgesForAllUsers = async () => {
  const userRepository = dataSource.getRepository(User);
  const users = await userRepository.find();

  users.forEach(async (user) => {
    await checkNewbie(user.id);
    await checkInitiationLists(user.id);
    await checkListArtisan(user.id);
    await checkListGuru(user.id);
    await checkPodcastAddict(user.id);
    await checkMovieBuff(user.id);
    await checkSupremeBingeWatcher(user.id);
    await checkYoutuber(user.id);
    await checkBuddingInfluencer(user.id);
    await checkMasterOfInfluence(user.id);
    await checkLegendaryInfluencer(user.id);
  });
};
