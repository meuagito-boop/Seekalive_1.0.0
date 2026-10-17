import { Link } from "wouter";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Post, currentUser, formatTimeAgo, formatCount } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import { getPostMediaType } from "@/lib/postMedia";

interface PostCardProps {
  post: Post;
  compact?: boolean;
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const { getUserById, toggleLike, toggleRepost, toggleBookmark } = useSocial();
  const author = getUserById(post.authorId);

  if (!author) return null;

  const isMe = post.authorId === "me" || post.authorId === currentUser.id;

  return (
    <div
      className="px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
      data-testid={`post-card-${post.id}`}
    >
      <div className="flex gap-3">
        <Link href={`/profile/${author.username}`} className="shrink-0">
          <Avatar className="w-10 h-10 hover:opacity-90 transition-opacity">
            <AvatarImage src={author.avatarUrl} />
            <AvatarFallback>{author.displayName[0]}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/profile/${author.username}`} className="font-bold text-sm hover:underline leading-tight">
                {author.displayName}
              </Link>
              {author.isVerified && (
                <span className="w-3.5 h-3.5 bg-primary rounded-full inline-flex items-center justify-center">
                  <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                </span>
              )}
              <span className="text-muted-foreground text-sm">@{author.username}</span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">{formatTimeAgo(post.createdAt)}</span>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 shrink-0"
              data-testid={`button-more-${post.id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <Link href={`/post/${post.id}`}>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {compact ? post.content.slice(0, 200) + (post.content.length > 200 ? "…" : "") : post.content}
            </p>
          </Link>

          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className={`mt-3 rounded-2xl overflow-hidden border border-border ${post.mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
              {post.mediaUrls.slice(0, 4).map((url, i) => (
                getPostMediaType(post, i) === "video" ? (
                  <video key={url} src={url} controls playsInline className="w-full max-h-80 bg-black object-cover" />
                ) : (
                  <Link key={url} href={`/post/${post.id}`}>
                    <img src={url} alt={`Post media ${i + 1}`} className="w-full object-cover max-h-80" />
                  </Link>
                )
              ))}
            </div>
          )}

          {post.audience !== "public" && (
            <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              post.audience === "circles" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {post.audience === "circles" ? "Amigos" : "Privado"}
            </span>
          )}

          <div className="flex items-center justify-between mt-3 text-muted-foreground -ml-1">
            <Link href={`/post/${post.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 hover:text-blue-400 hover:bg-blue-400/10 text-muted-foreground"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{formatCount(post.comments)}</span>
              </Button>
            </Link>

            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={() => toggleRepost(post.id)}
              data-testid={`button-repost-${post.id}`}
              className={`flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-green-500/10 ${
                post.isReposted ? "text-green-500" : "text-muted-foreground hover:text-green-500"
              }`}
            >
              <Repeat2 className="w-4 h-4" />
              {formatCount(post.reposts)}
            </motion.button>

            <motion.button
              whileTap={{ scale: 1.3 }}
              onClick={() => toggleLike(post.id)}
              data-testid={`button-like-${post.id}`}
              className={`flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-red-500/10 ${
                post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? "fill-red-500" : ""}`} />
              {formatCount(post.likes)}
            </motion.button>

            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={() => toggleBookmark(post.id)}
              data-testid={`button-bookmark-${post.id}`}
              className={`flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-yellow-500/10 ${
                post.isBookmarked ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${post.isBookmarked ? "fill-yellow-500" : ""}`} />
            </motion.button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 hover:text-primary hover:bg-primary/10 text-muted-foreground"
              data-testid={`button-share-${post.id}`}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
