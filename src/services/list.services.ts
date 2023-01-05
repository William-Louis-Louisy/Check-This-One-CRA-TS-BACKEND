import { dataSource } from "../app";
import { Content } from "../models/content.model";
import { List } from "../models/list.model";

// ADD CONTENT TO LIST
export const addContentToListService = async (listId: number, data: any) => {
  // Get list repository
  const listRepository = dataSource.getRepository(List);

  // Get content repository
  const contentRepository = dataSource.getRepository(Content);

  // Create new content from data
  const newContent = new Content();
  newContent.provider_id = data.provider_id;
  newContent.title = data.title;
  newContent.poster_path = data.poster_path;
  newContent.type = data.type;
  newContent.seen = data.seen;

  // Save content to database
  await contentRepository.save(newContent);

  // Get list from database
  const list = await listRepository.findOne({ where: { id: listId } });

  // Update list type from content type
  const contentType = newContent.type;
  if (
    contentType === "movie" ||
    contentType === "show" ||
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
};
