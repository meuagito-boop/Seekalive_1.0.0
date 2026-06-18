import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, MessageCircle, Repeat2, Share2, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockPosts, getUserById, formatTimeAgo, formatCount } from "@/data/mockData";

export default function PostDetail() {
  const params = useParams<{ postId: string }>();
  const [, setLocation] = useLocation();
  const post = mockPosts.find(p => p.id === params.postId) ?? mockPosts[0];
  const author = getUserById(post.authorId);
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likes, setLikes] = useState(post.likes);
  const [replyText, setReplyText] = useState("");
  const replies = mockPosts.filter(p => p.parentPostId === post.id || p.id !== post.id).slice(0, 4);

  function toggleLike() {
    setLiked(v => !v);
    setLikes(v => liked ? v - 1 : v + 1);
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-4 px-4 h-14">
        <button onClick={() => setLocation("/feed")} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Post</h1>
      </div>

      <article className="border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarImage src={author?.avatarUrl} />
              <AvatarFallback>{author?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-base">{author?.displayName}</p>
              <p className="text-muted-foreground text-sm">@{author?.username}</p>
            </div>
          </div>

          <p className="text-lg leading-relaxed mb-3">{post.content}</p>

          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="rounded-2xl overflow-hidden mb-3 border border-border">
              <img src={post.mediaUrls[0]} alt="Post media" className="w-full h-auto max-h-96 object-cover" />
            </div>
          )}

          <p className="text-muted-foreground text-sm mb-4">
            {new Date(post.createdAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", year: "numeric" })}
          </p>

          <div className="flex gap-6 py-3 border-y border-border text-sm text-muted-foreground">
            <span><strong className="text-foreground">{formatCount(post.reposts)}</strong> Reposts</span>
            <span><strong className="text-foreground">{formatCount(post.comments)}</strong> Respostas</span>
            <span><strong className="text-foreground">{formatCount(likes)}</strong> Curtidas</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <button className="p-2 rounded-full hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors" data-testid="button-comment">
              <MessageCircle className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors" data-testid="button-repost">
              <Repeat2 className="w-5 h-5" />
            </button>
            <motion.button
              whileTap={{ scale: 1.3 }}
              onClick={toggleLike}
              className={`p-2 rounded-full transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"}`}
              data-testid="button-like"
            >
              <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} />
            </motion.button>
            <button className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" data-testid="button-share">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" data-testid="button-bookmark">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 px-4 py-3 border-t border-border">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src="https://i.pravatar.cc/150?img=68" />
            <AvatarFallback>O</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Poste sua resposta"
              data-testid="input-reply"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-none outline-none"
            />
            {replyText.length > 0 && (
              <button
                className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                onClick={() => setReplyText("")}
                data-testid="button-post-reply"
              >
                Responder
              </button>
            )}
          </div>
        </div>
      </article>

      <div>
        <p className="px-4 py-3 text-sm font-semibold text-muted-foreground">Respostas</p>
        {replies.map((r, i) => {
          const rAuthor = getUserById(r.authorId);
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              className="px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors cursor-pointer"
              data-testid={`reply-${r.id}`}
            >
              <div className="flex gap-3">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={rAuthor?.avatarUrl} />
                  <AvatarFallback>{rAuthor?.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{rAuthor?.displayName}</span>
                    <span className="text-xs text-muted-foreground">@{rAuthor?.username} · {formatTimeAgo(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.content.slice(0, 120)}{r.content.length > 120 ? "..." : ""}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
