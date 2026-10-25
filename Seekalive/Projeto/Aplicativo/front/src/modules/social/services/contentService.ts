import type { Post } from "@/modules/social/types/post";
import type { PublishPostInput, SocialComment } from "@/modules/social/types/posts";
import { makeDemoComment, makeDemoPost } from "@/modules/social/application/contentValidation";

export interface ContentService {
  createPost(input: PublishPostInput): Promise<Post>;
  createComment(
    postId: string,
    content: string,
    authorId: string,
    replyToCommentId?: string,
  ): Promise<SocialComment>;
}

/** Session-only preview adapter; it does not send requests or persist data. */
export const demoContentAdapter: ContentService = {
  async createPost(input) {
    return makeDemoPost(input);
  },
  async createComment(postId, content, authorId, parent) {
    return makeDemoComment(postId, content, authorId, parent);
  },
};

export const contentService: ContentService = demoContentAdapter;
