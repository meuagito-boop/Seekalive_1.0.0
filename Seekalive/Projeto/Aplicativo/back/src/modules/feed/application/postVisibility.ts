import type { FeedPostRow } from "./postView";

type AuthorAccessView = {
  id: string;
  isPrivate: boolean;
  relationship: {
    following: "none" | "pending" | "accepted";
    inCircle: boolean;
    blockedByMe: boolean;
    blockedByThem: boolean;
  };
};

export function canReadPost(
  post: Pick<FeedPostRow, "authorId" | "audience">,
  viewerId: string | null,
  author: AuthorAccessView | undefined,
): boolean {
  if (!author || author.relationship.blockedByMe || author.relationship.blockedByThem) {
    return false;
  }
  const isOwner = viewerId === post.authorId;
  if (isOwner) return true;
  if (author.isPrivate && author.relationship.following !== "accepted") return false;
  if (post.audience === "public") return true;
  if (post.audience === "circles") return author.relationship.inCircle;
  return false;
}
