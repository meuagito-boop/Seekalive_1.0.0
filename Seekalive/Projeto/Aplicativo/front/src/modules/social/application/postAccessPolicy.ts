import type { User } from "@/modules/profile/types/user";
import type { Post } from "@/modules/social/types/post";
import { areMutualFollowers } from "@/modules/social/domain/followRelationships";
import { canReadPost } from "@/modules/social/application/contentValidation";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";

interface PostAccessPolicyInput {
  posts: Post[];
  users: User[];
  currentUser: User | null;
  viewer: User | null;
  isRemoteSocialSession: boolean;
}

export function createPostAccessPolicy({
  posts,
  users,
  currentUser,
  viewer,
  isRemoteSocialSession,
}: PostAccessPolicyInput) {
  function assertSession(authorId: string) {
    if (!currentUser) throw new ContentServiceError("Entre na sua conta para continuar.", 401);
    if (authorId !== currentUser.id) {
      throw new ContentServiceError("Você não tem permissão para publicar em nome de outra conta.", 403);
    }
  }

  function assertReadable(postId: string) {
    const post = posts.find((item) => item.id === postId);
    if (!post) throw new ContentServiceError("Conteúdo indisponível.", 404);
    const author = users.find((user) => user.id === post.authorId);
    const isInCircle = !!viewer && (isRemoteSocialSession
      ? Boolean(author?.isInCircle)
      : areMutualFollowers(viewer, author));
    if (!canReadPost(
      post,
      currentUser?.id ?? "",
      isInCircle,
      author?.isPrivate ?? false,
      author?.isFollowing ?? false,
    )) {
      throw new ContentServiceError("Você não tem acesso a esta publicação.", 403);
    }
    return post;
  }

  return { assertSession, assertReadable };
}
