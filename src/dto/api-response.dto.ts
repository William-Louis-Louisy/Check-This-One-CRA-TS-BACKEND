import { Content } from "../models/content.model";
import { List } from "../models/list.model";
import { Notification } from "../models/notification.model";
import { User } from "../models/user.model";

// Explicit response projections are a defense-in-depth boundary: NEVER
// serialize a TypeORM entity directly, including eager/nested relations.

export const toPublicUser = (user: User) => ({
  id: user.id,
  user_name: user.user_name,
  avatar: user.avatar,
  country: user.country,
  city: user.city,
  catchline: user.catchline,
  introduction: user.introduction,
});

export const toOwnUser = (user: User) => ({
  ...toPublicUser(user),
  email: user.email,
  role: user.role,
});

// Keep the admin dashboard's count-only contract without including full
// nested user/list entities or their content.
export const toAdminUser = (user: User) => ({
  ...toOwnUser(user),
  lists: (user.lists || []).map((list) => ({ id: list.id })),
  liked_lists: (user.liked_lists || []).map((list) => ({ id: list.id })),
});

export const toPublicContent = (content: Content) => ({
  id: content.id,
  provider_id: content.provider_id,
  provider_id_string: content.provider_id_string,
  title: content.title,
  poster_path: content.poster_path,
  type: content.type,
  seen: content.seen,
});

export const toList = (list: List) => ({
  id: list.id,
  type: list.type,
  title: list.title,
  description: list.description,
  creation_date: list.creation_date,
  creator_id: list.creator_id,
  likes: list.likes,
  privacy: list.privacy,
  tags: (list.tags || []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    name_fr: tag.name_fr,
  })),
  content: (list.content || []).map(toPublicContent),
  liked_by: (list.liked_by || []).map((user) => ({
    id: user.id,
    user_name: user.user_name,
    avatar: user.avatar,
  })),
});

export const toNotification = (notification: Notification) => ({
  id: notification.id,
  message: notification.message,
  message_en: notification.message_en,
  seen: notification.seen,
  updated_at: notification.updated_at,
  type: notification.type,
});
