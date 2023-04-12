import { dataSource } from "../app";
import { Content } from "../models/content.model";
import { List } from "../models/list.model";
import {
  checkMovieBuff,
  checkPodcastAddict,
  checkSupremeBingeWatcher,
  checkYoutuber,
} from "./badge.services";

// ADD CONTENT TO LIST
export const addContentToListService = async (listId: number, data: any) => {
  // Get list repository
  const listRepository = dataSource.getRepository(List);

  // Get content repository
  const contentRepository = dataSource.getRepository(Content);

  // Create new content from data
  const newContent = new Content();

  // VERIFY IF CONTENT DOESN'T EXIST
  const existingContent = await contentRepository.findOne({
    where: { provider_id: data.provider_id },
  });
  if (existingContent) {
    newContent.id = existingContent.id;
    newContent.provider_id = existingContent.provider_id;
    newContent.title = existingContent.title;
    newContent.poster_path = existingContent.poster_path;
    newContent.type = existingContent.type;
    newContent.seen = existingContent.seen;
  } else {
    if (data.type === "youtube" || data.type === "podcast") {
      newContent.provider_id_string = data.provider_id;
      newContent.title = data.title;
      newContent.poster_path = data.poster_path;
      newContent.type = data.type;
      newContent.seen = 0;
    } else {
      newContent.provider_id = data.provider_id;
      newContent.title = data.title;
      newContent.poster_path = data.poster_path;
      newContent.type = data.type;
      newContent.seen = 0;
    }

    // Save content to database
    await contentRepository.save(newContent);
  }

  // Get list from database
  const list = await listRepository.findOne({ where: { id: listId } });

  if (!list) {
    throw new Error(`List not found with id: ${listId}`);
  }

  // Update list type from content type
  const contentType = newContent.type;
  if (
    contentType === "movie" ||
    contentType === "show" ||
    contentType === "podcast" ||
    contentType === "youtube"
  ) {
    if (list.type !== contentType && list.type !== "mixed") {
      list.type = contentType;
    }
  } else {
    throw new Error(`Invalid content type: ${contentType}`);
  }

  if (
    list.type !== "mixed" &&
    list.content.some((c) => c.type !== contentType)
  ) {
    list.type = "mixed";
  }

  // Add content to list
  list.content.push(newContent);

  // Save list to database
  await listRepository.save(list);

  // Check if user has new badges
  if (list.type === "podcast") {
    await checkPodcastAddict(list.creator_id);
  }

  if (list.type === "movie") {
    await checkMovieBuff(list.creator_id);
  }

  if (list.type === "show") {
    await checkSupremeBingeWatcher(list.creator_id);
  }

  if (list.type === "youtube") {
    await checkYoutuber(list.creator_id);
  }
};
