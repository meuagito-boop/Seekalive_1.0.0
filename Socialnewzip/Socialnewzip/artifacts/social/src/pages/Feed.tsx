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

const feedTabs = ["Para você", "Seguindo", "Comunidades", "Vídeos"];

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
    /* Container igual ao PostCard — sem cabeçalho de avatar (já aparece acima como post) */
    <div
      className="border-b border-border"
      data-testid={`video-card-${post.id}`}
    >
      {/* Vídeo largo: largura total do container, altura fixa, ações sobrepostas dentro */}
      <div className="relative w-full overflow-hidden bg-black" style={{ height: "min(72vw, 480px)" }}>
        <img
          src={post.mediaUrls?.[0]}
          alt=""
          className={`w-full h-full object-cover transition-transform duration-700 ${isActive ? "scale-100" : "scale-105"}`}
        />

        {/* Gradientes */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/40 pointer-events-none" />

        {/* Mudo — topo esquerdo */}
        <div className="absolute top-3 left-3 z-20">
          <button
            onClick={onToggleMute}
            data-testid="button-mute"
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/15"
          >
            {globalMuted
              ? <VolumeX className="w-3.5 h-3.5 text-white" />
              : <Volume2 className="w-3.5 h-3.5 text-white" />
            }
          </button>
        </div>

        {/* Ações — dentro do vídeo, coluna na direita */}
        <div className="absolute right-3 bottom-10 z-20 flex flex-col items-center gap-4">
          <ActionBtn
            icon={<Heart className={`w-5 h-5 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />}
            label={formatCount(likes)}
            active={liked}
            activeClass="bg-red-500/25"
            onClick={toggleLike}
            testId="button-like-video"
          />
          <ActionBtn
            icon={<MessageCircle className="w-5 h-5 text-white" />}
            label={formatCount(post.comments)}
            testId="button-comment-video"
          />
          <ActionBtn
            icon={<Repeat2 className={`w-5 h-5 transition-colors ${reposted ? "text-green-400" : "text-white"}`} />}
            label={formatCount(reposts)}
            active={reposted}
            activeClass="bg-green-500/25"
            onClick={toggleRepost}
            testId="button-repost-video"
          />
          <ActionBtn
            icon={<Bookmark className={`w-5 h-5 transition-colors ${bookmarked ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />}
            active={bookmarked}
            activeClass="bg-yellow-500/25"
            onClick={() => setBookmarked(v => !v)}
            testId="button-bookmark-video"
          />
          <ActionBtn
            icon={<Share2 className="w-5 h-5 text-white" />}
            testId="button-share-video"
          />
          <SpinningDisc avatarUrl={author.avatarUrl} />
        </div>

        {/* Legenda + música — base esquerda do vídeo, respeitando coluna de ações */}
        <div className="absolute bottom-0 left-0 right-16 z-20 px-3 pb-3 pt-10 bg-gradient-to-t from-black/70 to-transparent">
          <button
            className="block text-left w-full"
            onClick={() => setCaptionExpanded(v => !v)}
            data-testid="button-expand-caption"
          >
            <p className={`text-white/90 text-xs leading-relaxed drop-shadow ${captionExpanded ? "" : "line-clamp-2"}`}>
              {post.content}
            </p>
            {post.content.length > 80 && (
              <span className="text-white/50 text-[10px] mt-0.5 block">
                {captionExpanded ? "ver menos" : "ver mais"}
              </span>
            )}
          </button>
          <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
            <Music2 className="w-3 h-3 text-white/60 shrink-0" />
            <div className="overflow-hidden flex-1">
              <motion.p
                animate={{ x: [0, -100, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="text-white/60 text-xs whitespace-nowrap"
              >
                {post.musicTitle}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-30">
          <motion.div
            className="h-full bg-primary"
            style={{ width: `${progress * 100}%` }}
            transition={{ duration: 0 }}
          />
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
      {activeTab !== 3 && <SocialComposer />}

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

        {activeTab === 3 && (
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
      </AnimatePresence>
    </div>
  );
}
