import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Share2, UserPlus, Check, Clock3, Play, BookOpenText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/post/PostCard";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";
import { EmptyState } from "@/components/content/StateBlocks";
import { formatCount, type Post } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { canReadPost } from "@/services/contentValidation";
import { getPostMediaType } from "@/lib/postMedia";
import { useToast } from "@/hooks/use-toast";

const feedTabs = ["Para você", "Seguindo", "Artigos", "Vídeos"] as const;

type FeedItem = { key: string; post: Post; repostedById?: string; at: string };


function useVisibleFeed() {
  const { posts, users, repostEntries, getUserById } = useSocial();
  const { currentUser } = useAppContext();
  const viewerId = currentUser?.id;

  return useMemo(() => {
    const visible = posts.filter((p) => {
      const author = getUserById(p.authorId);
      return !!author && !author.isBlocked && canReadPost(p, viewerId, author.isInCircle ?? false, author.isPrivate ?? false, author.isFollowing ?? false);
    });
    const byId = new Map(visible.map((p) => [p.id, p]));
    const items: FeedItem[] = [
      ...visible.map((post) => ({ key: post.id, post, at: post.createdAt })),
      ...repostEntries.flatMap((r) => {
        const post = byId.get(r.postId);
        return post ? [{ key: r.id, post, repostedById: r.authorId, at: r.createdAt }] : [];
      }),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return { visible, items };
    // getUserById is recreated each render; posts/users drive it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, users, repostEntries, currentUser, viewerId]);
}

function VideoFeedItem({ post }: { post: Post }) {
  const { getUserById, toggleLike, toggleRepost, toggleFollow, repostEntries } = useSocial();
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const author = getUserById(post.authorId);
  if (!author) return null;
  const viewerId = currentUser?.id ?? "me";
  const reposted = repostEntries.some((r) => r.postId === post.id && r.authorId === viewerId);
  const videoIndex = (post.mediaUrls ?? []).findIndex((_, i) => getPostMediaType(post, i) === "video");
  const isRealVideo = videoIndex >= 0;
  const poster = isRealVideo ? undefined : post.mediaUrls?.[0];

  function repost() {
    try { toggleRepost(post.id, viewerId); } catch (e) {
      toast({ title: "Repostagem indisponível", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  }

  const action = "flex flex-col items-center gap-0.5 select-none text-white";
  const bubble = "flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20";

  return (
    <div className="border-b border-border" data-testid={`video-card-${post.id}`}>
      <div className="relative w-full overflow-hidden bg-black" style={{ height: "min(72vw, 480px)" }}>
        {isRealVideo ? (
          <video src={post.mediaUrls![videoIndex]} controls playsInline className="h-full w-full object-contain" aria-label={`Vídeo de ${author.displayName}`} />
        ) : poster ? (
          <img src={poster} alt="" className="h-full w-full object-cover opacity-80" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/25 to-primary/5 p-8 text-center text-sm text-white/80">{post.content}</div>
        )}
        {!isRealVideo && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white/90">
              <Play className="h-3.5 w-3.5" /> Prévia ilustrativa — sem vídeo real
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute right-3 bottom-6 z-20 flex flex-col items-center gap-3">
          <div className="relative mb-1">
            <Link href={`/profile/${author.username}`} aria-label={`Perfil de ${author.displayName}`}>
              <Avatar className="h-11 w-11 border-2 border-white shadow-lg"><AvatarImage src={author.avatarUrl} alt="" /><AvatarFallback>{author.displayName[0]}</AvatarFallback></Avatar>
            </Link>
            {author.id !== viewerId && (
              <button type="button" onClick={() => toggleFollow(author.id)} aria-label={author.isFollowing ? "Deixar de seguir" : author.followRequestSent ? "Cancelar solicitação para seguir" : author.isPrivate ? "Solicitar para seguir" : "Seguir"}
                className={`absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full ${author.isFollowing ? "bg-zinc-600" : author.followRequestSent ? "bg-amber-600" : "bg-primary"}`}>
                {author.isFollowing ? <Check className="h-2.5 w-2.5 text-white" /> : author.followRequestSent ? <Clock3 className="h-2.5 w-2.5 text-white" /> : <UserPlus className="h-2.5 w-2.5 text-white" />}
              </button>
            )}
          </div>
          <motion.button whileTap={{ scale: 1.2 }} type="button" onClick={() => toggleLike(post.id)} aria-pressed={!!post.isLiked} aria-label="Curtir" className={action}>
            <span className={bubble}><Heart className={`h-5 w-5 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`} /></span>
            <span className="text-[10px] font-semibold">{formatCount(post.likes)}</span>
          </motion.button>
          <Link href={`/post/${post.id}`} aria-label="Comentários" className={action}>
            <span className={bubble}><MessageCircle className="h-5 w-5" /></span>
            <span className="text-[10px] font-semibold">{formatCount(post.comments)}</span>
          </Link>
          <motion.button whileTap={{ scale: 1.2 }} type="button" onClick={repost} disabled={post.audience !== "public"} aria-pressed={reposted} aria-label="Repostar" className={`${action} disabled:opacity-40`}>
            <span className={bubble}><Repeat2 className={`h-5 w-5 ${reposted ? "text-green-400" : ""}`} /></span>
            <span className="text-[10px] font-semibold">{formatCount(post.reposts)}</span>
          </motion.button>
          <button type="button" onClick={() => setShareOpen(true)} aria-label="Compartilhar" className={action}>
            <span className={bubble}><Share2 className="h-5 w-5" /></span>
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-16 z-10 px-3 pb-3">
          <p className="text-xs font-semibold text-white">{author.displayName}</p>
          <p className="line-clamp-2 text-xs text-white/85">{post.content}</p>
        </div>
      </div>
      <ShareContentDialog open={shareOpen} onOpenChange={setShareOpen} reference={{ type: "social_post", id: post.id }}
        title={post.content.slice(0, 80)} linkPath={`/post/${post.id}`}
        repost={post.audience === "public" ? { active: reposted, onToggle: repost } : undefined} />
    </div>
  );
}

export default function Feed() {
  const [activeTab, setActiveTab] = useState(0);
  const { getUserById } = useSocial();
  const { items, visible } = useVisibleFeed();

  const followingItems = items.filter((i) => getUserById(i.post.authorId)?.isFollowing || (i.repostedById && getUserById(i.repostedById)?.isFollowing));
  const articles = visible.filter((p) => p.format === "article");
  const videoPosts = visible.filter((p) => p.format !== "article" && (p.type === "video" || (p.mediaUrls?.length ?? 0) > 0));

  const list = (feed: FeedItem[]) => feed.map((i) => <PostCard key={i.key} post={i.post} repostedById={i.repostedById} />);
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } };

  return (
    <div className="relative min-h-[100dvh]">
      <div className="border-b border-border bg-background">
        <div role="tablist" aria-label="Seções do feed" className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {feedTabs.map((tab, i) => (
            <button key={tab} role="tab" aria-selected={activeTab === i} onClick={() => setActiveTab(i)} data-testid={`tab-feed-${tab}`}
              className={`min-w-[80px] flex-1 flex-shrink-0 border-b-2 py-3 text-sm font-medium transition-all ${
                activeTab === i ? "border-primary font-bold text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 0 && (
          <motion.div key="for-you" {...fade}>
            {items.length ? list(items) : <EmptyState title="Nada por aqui ainda" description="Publique algo ou siga pessoas." />}
          </motion.div>
        )}
        {activeTab === 1 && (
          <motion.div key="following" {...fade}>
            {followingItems.length === 0 ? (
              <EmptyState title="Nenhuma publicação ainda" description="Siga pessoas para ver as publicações e repostagens delas aqui."
                action={<Button asChild className="rounded-full"><Link href="/search">Descobrir pessoas</Link></Button>} />
            ) : list(followingItems)}
          </motion.div>
        )}
        {activeTab === 2 && (
          <motion.div key="articles" {...fade}>
            {articles.length ? articles.map((p) => <PostCard key={p.id} post={p} />) : (
              <EmptyState title="Nenhum artigo ainda" description="Artigos são publicações longas, com título e comentários próprios."
                action={<Button asChild className="rounded-full"><Link href="/article/create"><BookOpenText className="mr-2 h-4 w-4" />Escrever artigo</Link></Button>} />
            )}
          </motion.div>
        )}
        {activeTab === 3 && (
          <motion.div key="videos" {...fade} data-testid="video-feed">
            {videoPosts.length ? videoPosts.map((p) => <VideoFeedItem key={p.id} post={p} />) : <EmptyState title="Nenhum vídeo ainda" description="Vídeos publicados por quem você pode ver aparecem aqui." />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
