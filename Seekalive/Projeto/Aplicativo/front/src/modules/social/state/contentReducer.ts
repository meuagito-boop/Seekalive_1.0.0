import type { Post } from "@/modules/social/types/post";
import type { SocialComment, SocialRepost } from "@/modules/social/types/posts";

export interface SocialContentState {
  posts: Post[];
  remotePosts: Post[];
  postComments: SocialComment[];
  repostEntries: SocialRepost[];
}

export type SocialContentAction =
  | { type: "TOGGLE_LIKE"; postId: string }
  | { type: "TOGGLE_REPOST"; postId: string; actorId: string }
  | { type: "ADD_COMMENT"; comment: SocialComment }
  | { type: "TOGGLE_COMMENT_LIKE"; commentId: string }
  | { type: "DELETE_POST"; postId: string }
  | { type: "TOGGLE_BOOKMARK"; postId: string }
  | { type: "INCREMENT_COMMENTS"; postId: string }
  | { type: "ADD_POST"; post: Post }
  | { type: "UPSERT_POST"; post: Post }
  | { type: "UPSERT_REMOTE_PROFILE_POSTS"; authorId: string; posts: Post[]; append: boolean }
  | { type: "HYDRATE_POST_COMMENTS"; postId: string; comments: SocialComment[]; replace: boolean }
  | { type: "UPSERT_COMMENT"; comment: SocialComment }
  | { type: "REMOVE_COMMENT"; commentId: string };

export function socialContentReducer(
  state: SocialContentState,
  action: SocialContentAction,
): SocialContentState {
  switch (action.type) {
    case "TOGGLE_LIKE":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id !== action.postId
            ? post
            : {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? Math.max(0, post.likes - 1) : post.likes + 1,
              },
        ),
      };
    case "TOGGLE_REPOST": {
      const existing = state.repostEntries.find(
        (entry) => entry.postId === action.postId && entry.authorId === action.actorId,
      );
      return {
        ...state,
        repostEntries: existing
          ? state.repostEntries.filter((entry) => entry.id !== existing.id)
          : [{
              id: `repost_${action.actorId}_${action.postId}`,
              postId: action.postId,
              authorId: action.actorId,
              createdAt: new Date().toISOString(),
            }, ...state.repostEntries],
        posts: state.posts.map((post) =>
          post.id !== action.postId
            ? post
            : {
                ...post,
                isReposted: !existing,
                reposts: existing ? Math.max(0, post.reposts - 1) : post.reposts + 1,
              },
        ),
      };
    }
    case "ADD_COMMENT":
      if (state.postComments.some((comment) => comment.id === action.comment.id)) return state;
      return {
        ...state,
        postComments: [...state.postComments, action.comment],
        posts: state.posts.map((post) =>
          post.id === action.comment.postId ? { ...post, comments: post.comments + 1 } : post,
        ),
      };
    case "TOGGLE_COMMENT_LIKE":
      return {
        ...state,
        postComments: state.postComments.map((comment) =>
          comment.id !== action.commentId
            ? comment
            : {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1,
              },
        ),
      };
    case "DELETE_POST":
      return {
        ...state,
        posts: state.posts.filter((post) => post.id !== action.postId),
        remotePosts: state.remotePosts.filter((post) => post.id !== action.postId),
        postComments: state.postComments.filter((comment) => comment.postId !== action.postId),
        repostEntries: state.repostEntries.filter((entry) => entry.postId !== action.postId),
      };
    case "TOGGLE_BOOKMARK":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id !== action.postId ? post : { ...post, isBookmarked: !post.isBookmarked },
        ),
      };
    case "INCREMENT_COMMENTS":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id !== action.postId ? post : { ...post, comments: post.comments + 1 },
        ),
      };
    case "ADD_POST":
      return { ...state, posts: [action.post, ...state.posts] };
    case "UPSERT_POST": {
      const upsert = (posts: Post[]) =>
        posts.some((post) => post.id === action.post.id)
          ? posts.map((post) => post.id === action.post.id ? action.post : post)
          : [action.post, ...posts];
      return action.post.source === "server"
        ? { ...state, remotePosts: upsert(state.remotePosts) }
        : { ...state, posts: upsert(state.posts) };
    }
    case "UPSERT_REMOTE_PROFILE_POSTS": {
      const postsById = new Map(
        (action.append
          ? state.remotePosts
          : state.remotePosts.filter((post) => post.authorId !== action.authorId)
        ).map((post) => [post.id, post]),
      );
      for (const post of action.posts) postsById.set(post.id, { ...post, source: "server" });
      return { ...state, remotePosts: [...postsById.values()] };
    }
    case "HYDRATE_POST_COMMENTS": {
      const retained = action.replace
        ? state.postComments.filter((comment) => comment.postId !== action.postId)
        : state.postComments;
      const commentsById = new Map(retained.map((comment) => [comment.id, comment]));
      for (const comment of action.comments) commentsById.set(comment.id, comment);
      return { ...state, postComments: [...commentsById.values()] };
    }
    case "UPSERT_COMMENT":
      return {
        ...state,
        postComments: state.postComments.some((comment) => comment.id === action.comment.id)
          ? state.postComments.map((comment) => comment.id === action.comment.id ? action.comment : comment)
          : [...state.postComments, action.comment],
      };
    case "REMOVE_COMMENT":
      return {
        ...state,
        postComments: state.postComments.filter((comment) => comment.id !== action.commentId),
      };
  }
}
