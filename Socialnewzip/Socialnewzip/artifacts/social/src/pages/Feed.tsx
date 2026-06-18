import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Repeat2, Share2,
  Volume2, VolumeX, Music2, UserPlus, Check, Bookmark,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/post/PostCard";
import { SocialComposer } from "@/components/social/SocialComposer";
import { mockPosts, mockUsers, getUserById, formatCount } from "@/data/mockData";

const feedTabs = ["Para você", "Seguindo", "Vídeos", "Comunidades"];

// ── mock video data ──────────────────────────────────────────────────
const videoPosts = mockPosts.map((p, i) => ({
  ...p,
  type: "video" as const,
  mediaUrls: [`https://picsum.photos/seed/vid${i}/450/800`],
  musicTitle: ["original sound · alex_dev", "prod. by lucas_beats", "chill lo-fi mix", "ambient track v2", "orbit original"][i % 5],
  likeCount: p.likes,
}));

// ── mock community posts ─────────────────────────────────────────────
const communityPostMetas = [
  { communityName: "Fotografia Urbana SP", communityId: "c1" },
  { communityName: "Tech Talks Brasil", communityId: "c2" },
  { communityName: "Rolê Gastronômico", communityId: "c3" },
  { communityName: "Fotografia Urbana SP", communityId: "c1" },
];
const communityPosts = mockPosts.slice(0, 4).map((p, i) => ({
  ...p,
  id: `cp${i}`,
  ...communityPostMetas[i],
}));

// ── spinning disc ────────────────────────────────────────────────────
function SpinningDisc({ avatarUrl }: { avatarUrl: string }) {
  return (
    <div className="relative w-9 h-9">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="w-9 h-9 rounded-full border-2 border-white/30 overflow-hidden"
        style={{ backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover" }}
      />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white/60 pointer-events-none" />
      <div className="absolute inset-[35%] rounded-full bg-zinc-900" />
    </div>
  );
}

// ── action button ────────────────────────────────────────────────────
function ActionBtn({
  icon, label, active, activeClass, onClick, testId,
}: {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 1.3 }}
      onClick={onClick}
      data-testid={testId}
      className="flex flex-col items-center gap-0.5 select-none"
    >
      <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors ${active ? activeClass : "hover:bg-white/20"}`}>
        {icon}
      </div>
      {label !== undefined && (
        <span className="text-white/80 text-[10px] font-semibold leading-none">{label}</span>
      )}
    </motion.button>
  );
}

// ── single video card — layout matches PostCard container ────────────
function VideoFeedItem({
  post,
  isActive,
  globalMuted,
  onToggleMute,
}: {
  post: typeof videoPosts[0];
  isActive: boolean;
  globalMuted: boolean;
  onToggleMute: () => void;
}) {
  const author = getUserById(post.authorId) ?? mockUsers[0];
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likes, setLikes] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.isReposted ?? false);
  const [reposts, setReposts] = useState(post.reposts);
  const [bookmarked, setBookmarked] = useState(false);
  const [followed, setFollowed] = useState(author.isFollowing ?? false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) { setProgress(0); return; }
    const total = 12000 + Math.random() * 8000;
    const start = Date.now();
    let raf: number;
    function tick() {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / total, 1);
      setProgress(pct);
      if (pct < 1) raf = requestAnimationFrame(tick);
      else setProgress(0);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  function toggleLike() {
    setLiked(v => !v);
    setLikes(v => liked ? v - 1 : v + 1);
  }
  function toggleRepost() {
    setReposted(v => !v);
    setReposts(v => reposted ? v - 1 : v + 1);
  }

  return (
    /* Mesmo container do PostCard: px-4 py-3 border-b border-border */
    <div
      className="px-4 py-4 border-b border-border hover:bg-muted/20 transition-colors"
      data-testid={`video-card-${post.id}`}
    >
      {/* Linha superior: avatar + nome (igual ao PostCard) */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profile/${author.username}`} className="shrink-0">
          <Avatar className="w-10 h-10 hover:opacity-90 transition-opacity">
            <AvatarImage src={author.avatarUrl} />
            <AvatarFallback>{author.displayName[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/profile/${author.username}`} className="font-bold text-sm hover:underline leading-tight">
              {author.displayName}
            </Link>
            {author.isVerified && (
              <span className="w-3.5 h-3.5 bg-primary rounded-full inline-flex items-center justify-center">
                <Check className="w-2 h-2 text-white" />
              </span>
            )}
            <span className="text-muted-foreground text-sm">@{author.username}</span>
          </div>
        </div>
        {/* Botão seguir */}
        <button
          onClick={() => setFollowed(v => !v)}
          data-testid="button-follow-video"
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            followed
              ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
              : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          {followed ? "Seguindo" : "Seguir"}
        </button>
      </div>

      {/* Palco: vídeo 9:16 centralizado + ações à direita */}
      <div className="flex items-end gap-3 justify-center">

        {/* Caixa do vídeo — 9:16, largura máxima controlada */}
        <div
          className="relative rounded-xl overflow-hidden bg-black shadow-xl flex-shrink-0"
          style={{ aspectRatio: "9/16", width: "min(240px, 55vw)" }}
        >
          <img
            src={post.mediaUrls?.[0]}
            alt=""
            className={`w-full h-full object-cover transition-transform duration-700 ${isActive ? "scale-100" : "scale-105"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent pointer-events-none" />

          {/* Botão mudo */}
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={onToggleMute}
              data-testid="button-mute"
              className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10"
            >
              {globalMuted
                ? <VolumeX className="w-3 h-3 text-white" />
                : <Volume2 className="w-3 h-3 text-white" />
              }
            </button>
          </div>

          {/* Legenda + música na base do vídeo */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-2.5 pb-2.5 pt-8 bg-gradient-to-t from-black/80 to-transparent">
            <button
              className="block text-left w-full"
              onClick={() => setCaptionExpanded(v => !v)}
              data-testid="button-expand-caption"
            >
              <p className={`text-white/90 text-[11px] leading-relaxed drop-shadow ${captionExpanded ? "" : "line-clamp-2"}`}>
                {post.content}
              </p>
              {post.content.length > 60 && (
                <span className="text-white/50 text-[10px]">
                  {captionExpanded ? "ver menos" : "ver mais"}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
              <Music2 className="w-2.5 h-2.5 text-white/60 shrink-0" />
              <div className="overflow-hidden flex-1">
                <motion.p
                  animate={{ x: [0, -80, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="text-white/60 text-[10px] whitespace-nowrap"
                >
                  {post.musicTitle}
                </motion.p>
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-20">
            <motion.div
              className="h-full bg-primary"
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0 }}
            />
          </div>
        </div>

        {/* Trilho de ações — à direita do vídeo */}
        <div className="flex flex-col items-center gap-3 pb-1 shrink-0">
          <ActionBtn
            icon={<Heart className={`w-5 h-5 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />}
            label={formatCount(likes)}
            active={liked}
            activeClass="bg-red-500/15"
            onClick={toggleLike}
            testId="button-like-video"
          />
          <ActionBtn
            icon={<MessageCircle className="w-5 h-5 text-foreground" />}
            label={formatCount(post.comments)}
            testId="button-comment-video"
          />
          <ActionBtn
            icon={<Repeat2 className={`w-5 h-5 transition-colors ${reposted ? "text-green-500" : "text-foreground"}`} />}
            label={formatCount(reposts)}
            active={reposted}
            activeClass="bg-green-500/15"
            onClick={toggleRepost}
            testId="button-repost-video"
          />
          <ActionBtn
            icon={<Bookmark className={`w-5 h-5 transition-colors ${bookmarked ? "fill-yellow-400 text-yellow-400" : "text-foreground"}`} />}
            active={bookmarked}
            activeClass="bg-yellow-500/15"
            onClick={() => setBookmarked(v => !v)}
            testId="button-bookmark-video"
          />
          <ActionBtn
            icon={<Share2 className="w-5 h-5 text-foreground" />}
            testId="button-share-video"
          />
          <SpinningDisc avatarUrl={author.avatarUrl} />
        </div>
      </div>
    </div>
  );
}

// ── video feed — idêntico ao container dos outros feeds ──────────────
function SocialVideoFeed() {
  const [muted, setMuted] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = itemRefs.current.findIndex(el => el === entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { threshold: 0.4 }
    );
    itemRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div data-testid="video-feed">
      {videoPosts.map((post, i) => (
        <div
          key={post.id}
          ref={el => { itemRefs.current[i] = el; }}
        >
          <VideoFeedItem
            post={post}
            isActive={activeIndex === i}
            globalMuted={muted}
            onToggleMute={() => setMuted(v => !v)}
          />
        </div>
      ))}
    </div>
  );
}

// ── main feed page ───────────────────────────────────────────────────
export default function Feed() {
  const [activeTab, setActiveTab] = useState(0);

  const followingPosts = mockPosts.filter(p => {
    const author = getUserById(p.authorId);
    return author?.isFollowing;
  });

  return (
    <div className="relative min-h-screen">

      {/* Composer — only for non-video tabs */}
      {activeTab !== 2 && <SocialComposer />}

      {/* Tab header — normal flow (not sticky, avoids overlap with content) */}
      <div className="bg-background border-b border-border">
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {feedTabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              data-testid={`tab-feed-${tab}`}
              className={`flex-shrink-0 flex-1 min-w-[80px] py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === i
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 0 && (
          <motion.div
            key="for-you"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {mockPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </motion.div>
        )}

        {activeTab === 1 && (
          <motion.div
            key="following"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {followingPosts.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <p className="font-medium text-base">Nenhum post ainda</p>
                <p className="text-sm mt-2 opacity-70">Siga pessoas para ver seus posts aqui.</p>
                <Link href="/search">
                  <Button className="mt-6 rounded-full">Descobrir pessoas</Button>
                </Link>
              </div>
            ) : (
              followingPosts.map(post => <PostCard key={post.id} post={post} />)
            )}
          </motion.div>
        )}

        {activeTab === 2 && (
          <motion.div
            key="videos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SocialVideoFeed />
          </motion.div>
        )}

        {activeTab === 3 && (
          <motion.div
            key="communities"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {communityPosts.map(post => (
              <div key={post.id}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <div className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center">
                    <LayoutGrid className="w-3 h-3 text-primary" />
                  </div>
                  <Link
                    href="/communities"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {post.communityName}
                  </Link>
                </div>
                <PostCard post={post} />
              </div>
            ))}
            <div className="flex justify-center py-6">
              <Link href="/communities">
                <Button variant="outline" size="sm" className="rounded-full">
                  Ver todas as comunidades
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
