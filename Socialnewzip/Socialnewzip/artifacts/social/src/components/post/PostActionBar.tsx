import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Share2, Bookmark } from "lucide-react";
import { formatCount, type Post } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { postPath } from "@/lib/contentLinks";
import { useToast } from "@/hooks/use-toast";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";

/** One interaction model shared by feed cards, post detail and article reader. */
export function PostActionBar({ post, size = "sm" }: { post: Post; size?: "sm" | "lg" }) {
  const { toggleLike, toggleRepost, toggleBookmark, repostEntries } = useSocial();
  const { currentUser } = useAppContext();
  const viewerId = currentUser?.id ?? "me";
  const [shareOpen, setShareOpen] = useState(false);
  const { toast } = useToast();
  const canRepost = post.audience === "public";
  function repost() {
    try {
      toggleRepost(post.id, viewerId);
    } catch (error) {
      toast({ title: "Repostagem indisponível", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    }
  }
  const reposted = repostEntries.some((r) => r.postId === post.id && r.authorId === viewerId);
  const icon = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const btn = "flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const title = post.format === "article" && post.article ? post.article.title : post.content.slice(0, 80) || "Publicação";

  return (
    <>
      <div className="-ml-1 mt-3 flex items-center justify-between text-muted-foreground">
        <Link
          href={postPath(post)}
          aria-label={`Comentar (${post.comments})`}
          className={`${btn} text-muted-foreground hover:bg-primary/10 hover:text-primary`}
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className={icon} />
          {formatCount(Math.max(0, post.comments))}
        </Link>
        <motion.button
          type="button"
          whileTap={{ scale: 1.2 }}
          onClick={repost}
          disabled={!canRepost}
          title={canRepost ? undefined : "Somente publicações públicas podem ser repostadas"}
          aria-pressed={reposted}
          aria-label={reposted ? "Desfazer repostagem" : "Repostar"}
          data-testid={`button-repost-${post.id}`}
          className={`${btn} hover:bg-green-500/10 disabled:opacity-40 disabled:hover:bg-transparent ${reposted ? "text-green-500" : "hover:text-green-500"}`}
        >
          <Repeat2 className={icon} />
          {formatCount(Math.max(0, post.reposts))}
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 1.3 }}
          onClick={() => toggleLike(post.id)}
          aria-pressed={!!post.isLiked}
          aria-label={post.isLiked ? "Descurtir" : "Curtir"}
          data-testid={`button-like-${post.id}`}
          className={`${btn} hover:bg-red-500/10 ${post.isLiked ? "text-red-500" : "hover:text-red-500"}`}
        >
          <Heart className={`${icon} ${post.isLiked ? "fill-red-500" : ""}`} />
          {formatCount(Math.max(0, post.likes))}
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 1.2 }}
          onClick={() => toggleBookmark(post.id)}
          aria-pressed={!!post.isBookmarked}
          aria-label={post.isBookmarked ? "Remover dos salvos" : "Salvar"}
          data-testid={`button-bookmark-${post.id}`}
          className={`${btn} hover:bg-yellow-500/10 ${post.isBookmarked ? "text-yellow-500" : "hover:text-yellow-500"}`}
        >
          <Bookmark className={`${icon} ${post.isBookmarked ? "fill-yellow-500" : ""}`} />
        </motion.button>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Compartilhar"
          data-testid={`button-share-${post.id}`}
          className={`${btn} hover:bg-primary/10 hover:text-primary`}
        >
          <Share2 className={icon} />
        </button>
      </div>
      <ShareContentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        reference={{ type: "social_post", id: post.id }}
        title={title}
        linkPath={postPath(post)}
        repost={canRepost ? { active: reposted, onToggle: repost } : undefined}
      />
    </>
  );
}
