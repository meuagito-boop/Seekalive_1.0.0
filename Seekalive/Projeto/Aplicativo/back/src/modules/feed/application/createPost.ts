import { db, feedPosts } from "@workspace/db";
import type { PostAudience } from "@workspace/api-zod";

type CreatePostCommand = {
  authorId: string;
  content: string;
  audience: PostAudience;
  format: "text" | "article";
  articleTitle?: string;
  articleBody?: string;
};

export async function createPost(command: CreatePostCommand) {
  const [post] = await db.insert(feedPosts).values({
    authorId: command.authorId,
    content: command.content,
    audience: command.audience,
    format: command.format,
    articleTitle: command.articleTitle ?? null,
    articleBody: command.articleBody ?? null,
  }).returning();
  return post;
}
