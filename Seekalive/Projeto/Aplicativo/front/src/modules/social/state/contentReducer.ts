import type { SocialAction, SocialState } from "@/modules/app/state/socialState";

export function reduceSocialContent(state: SocialState, action: SocialAction): SocialState | null {
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
    default:
      return null;
  }
}
