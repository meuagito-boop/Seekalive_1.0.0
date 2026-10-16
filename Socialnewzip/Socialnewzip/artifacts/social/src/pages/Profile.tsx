import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Globe, Calendar, MoreHorizontal, Check, UserPlus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post/PostCard";
import { currentUser as mockCurrentUser, formatCount } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";

const tabs = ["Posts", "Respostas", "Mídia", "Curtidas"];

export default function Profile() {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const { users, posts, getUserById, toggleFollow, requestCircle, cancelCircle } = useSocial();
  const { currentUser: signedInUser } = useAppContext();
  const viewer = signedInUser ?? mockCurrentUser;

  // Resolve user
  const username = params.username;
  const isMe = username === viewer.username || !username;

  const user = isMe
    ? viewer
    : (users.find(u => u.username === username) ?? users[0] ?? viewer);

  const following = user.isFollowing ?? false;
  const circleStatus = user.circleStatus ?? null;

  // Posts filtered to this user
  const userPosts = posts.filter(p => p.authorId === user.id);

  function handleFollow() {
    if (isMe) return;
    toggleFollow(user.id);
  }

  function handleCircle() {
    if (isMe) return;
    if (!circleStatus || circleStatus === null) requestCircle(user.id);
    else if (circleStatus === "pending") cancelCircle(user.id);
    // accepted → no-op (manage from Circles page)
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Sticky back + title bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center gap-4 px-4 h-14 border-b border-border">
        <button
          onClick={() => window.history.back()}
          className="text-muted-foreground hover:text-foreground p-1"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold text-base leading-tight">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">{formatCount(user.stats.posts)} posts</p>
        </div>
      </div>

      {/* Cover */}
      <div className="relative">
        <div className="h-36 md:h-48 bg-gradient-to-br from-primary/20 via-accent/20 to-background overflow-hidden">
          {user.coverUrl && (
            <img src={user.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-4">
          <div className="flex items-end justify-between -mt-12 mb-3">
            <Avatar className="w-24 h-24 border-4 border-background ring-2 ring-primary/30">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-2xl">{user.displayName[0]}</AvatarFallback>
            </Avatar>

            <div className="flex items-center gap-2 mt-2">
              {isMe ? (
                <Link href="/profile/edit">
                  <Button
                    variant="outline"
                    className="rounded-full h-9 px-5 text-sm font-semibold border-border"
                    data-testid="button-edit-profile"
                  >
                    Editar perfil
                  </Button>
                </Link>
              ) : (
                <>
                  {/* Amigos button */}
                  <button
                    onClick={handleCircle}
                    data-testid="button-circle"
                    className={`flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold border transition-all ${
                      circleStatus === "accepted"
                        ? "bg-muted border-border text-muted-foreground"
                        : circleStatus === "pending"
                        ? "bg-primary/10 border-primary/50 text-primary"
                        : "border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {circleStatus === "accepted"
                      ? <><Check className="w-3 h-3" /> Amigos</>
                      : circleStatus === "pending"
                      ? <><Users className="w-3 h-3" /> Solicitado</>
                      : <><UserPlus className="w-3 h-3" /> Adicionar</>
                    }
                  </button>

                  {/* Follow button */}
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleFollow}
                      variant={following ? "outline" : "default"}
                      className="rounded-full h-9 px-5 text-sm font-semibold"
                      data-testid="button-follow"
                    >
                      {following ? "Seguindo" : "Seguir"}
                    </Button>
                  </motion.div>

                  {/* More menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(v => !v)}
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-border hover:bg-muted/50 transition-colors"
                      data-testid="button-more"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          className="absolute right-0 top-10 w-44 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                          {["Silenciar", "Bloquear", "Reportar", "Compartilhar perfil"].map(action => (
                            <button
                              key={action}
                              className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors ${
                                action === "Bloquear" ? "text-destructive" : "text-foreground"
                              }`}
                              onClick={() => setShowMenu(false)}
                              data-testid={`action-${action.toLowerCase().replace(" ", "-")}`}
                            >
                              {action}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User info */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{user.displayName}</h1>
              {user.accountType === "commercial" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Comercial
                </span>
              )}
              {user.isVerified && (
                <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">@{user.username}</p>
            {user.bio && <p className="mt-2 text-sm leading-relaxed">{user.bio}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {user.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{user.location}</span>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <Globe className="w-3.5 h-3.5" />{user.website.replace("https://", "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Entrou em {new Date(user.joinedAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-5 mb-1 text-sm">
            <Link href={`/profile/${user.username}/following`} className="hover:underline" data-testid="link-following">
              <span className="font-bold">{formatCount(user.stats.following)}</span>
              <span className="text-muted-foreground ml-1">Seguindo</span>
            </Link>
            <Link href={`/profile/${user.username}/followers`} className="hover:underline" data-testid="link-followers">
              <span className="font-bold">{formatCount(user.stats.followers)}</span>
              <span className="text-muted-foreground ml-1">Seguidores</span>
            </Link>
            <Link href={`/profile/${user.username}/circles`} className="hover:underline" data-testid="link-circles">
              <span className="font-bold">{formatCount(user.stats.circles)}</span>
              <span className="text-muted-foreground ml-1">Amigos</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border sticky top-14 bg-background z-20">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            data-testid={`tab-profile-${tab}`}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 0 && (
          userPosts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm font-medium">Nenhum post ainda</p>
            </div>
          ) : userPosts.map(post => <PostCard key={post.id} post={post} />)
        )}
        {activeTab !== 0 && (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <p className="text-sm">Nenhum conteúdo ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
