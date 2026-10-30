import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Share2, Bookmark } from "lucide-react";
import type { Post } from "@/modules/social/types/post";
import { formatCount } from "@/lib/formatters";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { postPath } from "@/lib/contentLinks";
import { useToast } from "@/hooks/use-toast";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";

/** One interaction model shared by feed cards, post detail and article reader. */
export function PostActionBar({ post, size = "sm" }: { post: Post; size?: "sm" | "lg" }) {
  const {
    toggleLike,
    toggleRepost,
    toggleBookmark,
    repostEntries,
    getPostById,
    isRemoteSocialSession,
  } = useSocial();
  const { currentUser } = useAppContext();
  const viewerId = currentUser?.id ?? "me";
  const [shareOpen, setShareOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"like" | "repost" | "bookmark" | null>(null);
  const { toast } = useToast();
  const currentPost = getPostById(post.id) ?? post;
  const canRepost = currentPost.audience === "public";
  async function runAction(
    action: "like" | "repost" | "bookmark",
    operation: () => Promise<void>,
  ) {
    if (busyAction) return;
    setBusyAction(action);
    try {
      await operation();
    } catch (error) {
      toast({
        title: action === "repost" ? "Repostagem indisponível" : action === "like" ? "Curtida não atualizada" : "Salvamento não atualizado",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  }
  function repost() {
    return runAction("repost", () => toggleRepost(post.id, viewerId));
  }
  const reposted = isRemoteSocialSession
    ? Boolean(currentPost.isReposted)
    : repostEntries.some((r) => r.postId === post.id && r.authorId === viewerId);
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
          onClick={() => void repost()}
          disabled={!canRepost || busyAction !== null}
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
          onClick={() => void runAction("like", () => toggleLike(post.id))}
          disabled={busyAction !== null}
          aria-pressed={!!currentPost.isLiked}
          aria-label={currentPost.isLiked ? "Descurtir" : "Curtir"}
          data-testid={`button-like-${post.id}`}
          className={`${btn} hover:bg-red-500/10 disabled:opacity-50 ${currentPost.isLiked ? "text-red-500" : "hover:text-red-500"}`}
        >
          <Heart className={`${icon} ${currentPost.isLiked ? "fill-red-500" : ""}`} />
          {formatCount(Math.max(0, currentPost.likes))}
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 1.2 }}
          onClick={() => void runAction("bookmark", () => toggleBookmark(post.id))}
          disabled={busyAction !== null}
          aria-pressed={!!currentPost.isBookmarked}
          aria-label={currentPost.isBookmarked ? "Remover dos salvos" : "Salvar"}
          data-testid={`button-bookmark-${post.id}`}
          className={`${btn} hover:bg-yellow-500/10 disabled:opacity-50 ${currentPost.isBookmarked ? "text-yellow-500" : "hover:text-yellow-500"}`}
        >
          <Bookmark className={`${icon} ${currentPost.isBookmarked ? "fill-yellow-500" : ""}`} />
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
        repost={canRepost ? { active: reposted, onToggle: () => void repost() } : undefined}
      />
    </>
  );
}
