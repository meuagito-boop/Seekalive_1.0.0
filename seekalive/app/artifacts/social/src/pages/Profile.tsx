import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Globe, Calendar, MoreHorizontal, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post/PostCard";
import { currentUser as mockCurrentUser, formatCount } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { CommercialProfilePage } from "@/components/profile/CommercialProfilePage";
import { getProfileMedia } from "@/lib/postMedia";
import { canReadPost } from "@/services/contentValidation";
import { postPath } from "@/lib/contentLinks";
import { UnavailableState } from "@/components/content/StateBlocks";
import { useToast } from "@/hooks/use-toast";

const tabs = [
  { label: "Publicações", id: "Posts" },
  { label: "Respostas", id: "Respostas" },
  { label: "Mídias", id: "Mídias" },
  { label: "Curtidas", id: "Curtidas" },
  { label: "Artigos", id: "Artigos" },
];

export default function Profile() {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const { users, posts, repostEntries, postComments, toggleFollow, blockUser, unblockUser } = useSocial();
  const { currentUser: signedInUser } = useAppContext();
  const viewer = signedInUser ?? (import.meta.env.DEV ? mockCurrentUser : null);
  if (!viewer) {
    return (
      <UnavailableState
        title="Sessão indisponível"
        description="Entre na sua conta para ver este perfil."
        action={<Link href="/login" className="text-sm font-semibold text-primary hover:underline">Ir para o login</Link>}
      />
    );
  }

  // Resolve user
  const username = params.username;
  const isMe = username === viewer.username || !username;

  const found = isMe ? viewer : users.find(u => u.username === username);
  if (!found) {
    return (
      <UnavailableState
        title="Perfil indisponível"
        description={`Não encontramos @${username}. A conta pode ter sido removida.`}
        action={<Link href="/feed" className="text-sm font-semibold text-primary hover:underline">Voltar ao feed</Link>}
      />
    );
  }
  const user = found;

  const following = user.isFollowing ?? false;
  const followRequested = user.followRequestSent ?? false;
  const inCircle = user.isInCircle ?? false;
  const circleCount = isMe ? users.filter(candidate => candidate.isInCircle).length : user.stats.circles;

  // Posts filtered to this user
  const visibleToViewer = (p: (typeof posts)[number]) => {
    const author = users.find(u => u.id === p.authorId) ?? (p.authorId === viewer.id ? viewer : undefined);
    return !!author && !author.isBlocked && canReadPost(p, viewer.id, author.isInCircle ?? false, author.isPrivate ?? false, author.isFollowing ?? false);
  };
  // Authored posts plus repost distribution records (original author preserved).
  const timeline = [
    ...posts.filter(p => p.authorId === user.id && visibleToViewer(p)).map(p => ({ key: p.id, post: p, at: p.createdAt, repostedById: undefined as string | undefined })),
    ...repostEntries.filter(r => r.authorId === user.id).flatMap(r => {
      const p = posts.find(x => x.id === r.postId);
      return p && visibleToViewer(p) ? [{ key: r.id, post: p, at: r.createdAt, repostedById: r.authorId }] : [];
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const userArticles = posts.filter(p => p.authorId === user.id && p.format === "article" && visibleToViewer(p));
  const userComments = postComments.filter(c => {
    const target = posts.find(post => post.id === c.postId);
    return c.authorId === user.id && !!target && visibleToViewer(target);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const likedPosts = isMe ? posts.filter(p => p.isLiked && visibleToViewer(p)) : [];
  const userMedia = getProfileMedia(posts, user.id, isMe, user.isInCircle ?? false, user.isPrivate ?? false, user.isFollowing ?? false);

  function handleFollow() {
    if (isMe || user.isBlocked) return;
    toggleFollow(user.id);
  }

  function handleBlockToggle() {
    if (user.isBlocked) {
      unblockUser(user.id);
      toast({ title: "Bloqueio removido", description: "A alteração foi salva neste navegador." });
    } else {
      blockUser(user.id);
      toast({ title: "Perfil bloqueado", description: "Você não verá o conteúdo deste perfil." });
    }
    setShowMenu(false);
  }

  if (!isMe && user.isBlocked) {
    return (
      <UnavailableState
        title="Perfil bloqueado"
        description="Você bloqueou este perfil. O conteúdo dele não aparece para você."
        action={<Button variant="outline" onClick={handleBlockToggle}>Desbloquear perfil</Button>}
      />
    );
  }

  if (!isMe && user.isPrivate && !following) {
    return (
      <div className="min-h-[70vh] px-5 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <Avatar className="mx-auto mb-4 h-16 w-16">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold">{user.displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {followRequested
              ? "Sua solicitação está aguardando aprovação. O conteúdo ficará visível depois que o dono aceitar."
              : "Este perfil é privado. Envie uma solicitação para seguir; as publicações públicas do perfil ficam visíveis após a aprovação."}
          </p>
          <Button onClick={handleFollow} className="mt-5 rounded-full" variant={followRequested ? "outline" : "default"}>
            {followRequested ? "Cancelar solicitação" : "Solicitar para seguir"}
          </Button>
          <Button
            variant="outline"
            className="mt-2 rounded-full"
            onClick={() => {
              blockUser(user.id);
              toast({ title: "Perfil bloqueado", description: "Você não verá o conteúdo deste perfil." });
            }}
            data-testid="button-block-private-profile"
          >
            Bloquear perfil
          </Button>
        </div>
      </div>
    );
  }

  if (user.accountType === "commercial" && user.commercialProfile) {
    return <CommercialProfilePage user={user} isMe={isMe} />;
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      {/* Sticky back + title bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center gap-4 px-4 h-14 border-b border-border">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/feed"))}
          aria-label="Voltar"
          className="text-muted-foreground hover:text-foreground p-1"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate font-bold text-base leading-tight">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">{formatCount(timeline.length)} {timeline.length === 1 ? "publicação" : "publicações"}</p>
        </div>
      </div>

      {/* Cover */}
      <div className="relative">
        <div className="h-36 md:h-48 bg-gradient-to-br from-primary/20 via-accent/20 to-background overflow-hidden">
          {user.coverUrl && (
            <img src={user.coverUrl} alt={`Capa de ${user.displayName}`} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-4">
          <div className="flex flex-wrap items-end justify-between gap-2 -mt-12 mb-3">
            <Avatar className="w-24 h-24 border-4 border-background ring-2 ring-primary/30">
              <AvatarImage src={user.avatarUrl} alt={`Foto de ${user.displayName}`} />
              <AvatarFallback className="text-2xl">{user.displayName[0]}</AvatarFallback>
            </Avatar>

            <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
              {isMe ? (
                <Button asChild variant="outline" className="rounded-full h-9 px-5 text-sm font-semibold border-border" data-testid="button-edit-profile">
                  <Link href="/profile/edit">Editar perfil</Link>
                </Button>
              ) : (
                <>
                  {inCircle && (
                    <span className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground" data-testid="badge-mutual-circle">
                      <Check className="h-3 w-3" /> No Círculo
                    </span>
                  )}

                  {/* Follow button */}
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleFollow}
                      variant={following || followRequested ? "outline" : "default"}
                      className="rounded-full h-9 px-5 text-sm font-semibold"
                      data-testid="button-follow"
                    >
                      {following ? "Seguindo" : followRequested ? "Cancelar solicitação" : user.isPrivate ? "Solicitar para seguir" : "Seguir"}
                    </Button>
                  </motion.div>

                  {/* More menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMenu(v => !v)}
                      aria-label="Mais opções do perfil"
                      aria-expanded={showMenu}
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
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="w-full cursor-not-allowed text-left px-4 py-3 text-sm text-muted-foreground"
                            data-testid="action-silenciar"
                          >
                            Silenciar<span className="block text-[11px]">Indisponível nesta versão</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleBlockToggle}
                            className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50"
                            data-testid="action-bloquear"
                          >
                            {user.isBlocked ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="w-full cursor-not-allowed text-left px-4 py-3 text-sm text-muted-foreground"
                            data-testid="action-denunciar"
                          >
                            Denunciar<span className="block text-[11px]">Indisponível nesta versão</span>
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setShowMenu(false);
                              const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/profile/${user.username}`;
                              navigator.clipboard?.writeText(url).then(
                                () => toast({ title: "Link do perfil copiado" }),
                                () => toast({ title: "Não foi possível copiar o link", variant: "destructive" }),
                              );
                            }}
                            data-testid="action-compartilhar-perfil"
                          >
                            Copiar link do perfil
                          </button>
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
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 break-words text-xl font-bold">{user.displayName}</h1>
              {user.isVerified && (
                <span className="w-5 h-5 shrink-0 bg-primary rounded-full flex items-center justify-center" aria-label="Conta verificada" title="Conta verificada">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm break-all">@{user.username}</p>
            {user.bio && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{user.bio}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {user.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{user.location}</span>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1 break-all text-primary hover:underline">
                  <Globe className="w-3.5 h-3.5" />{user.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Entrou em {new Date(user.joinedAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 mb-1 text-sm">
            <Link href={`/profile/${user.username}/following`} className="hover:underline" data-testid="link-following">
              <span className="font-bold">{formatCount(user.stats.following)}</span>
              <span className="text-muted-foreground ml-1">Seguindo</span>
            </Link>
            <Link href={`/profile/${user.username}/followers`} className="hover:underline" data-testid="link-followers">
              <span className="font-bold">{formatCount(user.stats.followers)}</span>
              <span className="text-muted-foreground ml-1">Seguidores</span>
            </Link>
            <Link href={`/profile/${user.username}/circles`} className="hover:underline" data-testid="link-circles">
              <span className="font-bold">{formatCount(circleCount)}</span>
              <span className="text-muted-foreground ml-1">Círculo</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Seções do perfil" className="flex overflow-x-auto border-b border-border sticky top-14 bg-background z-20 [scrollbar-width:none]">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === i}
            onClick={() => setActiveTab(i)}
            data-testid={`tab-profile-${tab.id}`}
            className={`min-w-[96px] flex-1 shrink-0 whitespace-nowrap px-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 0 && (
          timeline.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm font-medium">Nenhuma publicação ainda.</p>
            </div>
          ) : timeline.map(item => <PostCard key={item.key} post={item.post} repostedById={item.repostedById} />)
        )}
        {activeTab === 2 && (
          userMedia.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm font-medium">Nenhuma mídia nesta conta ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3">
              {userMedia.map((media) => (
                <div key={media.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {media.type === "video" ? (
                    <video src={media.url} controls playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={media.url} alt={`Mídia de ${user.displayName}`} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )
        )}
        {activeTab === 1 && (
          userComments.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground"><p className="text-sm">Nenhuma resposta ainda.</p></div>
          ) : userComments.map(c => {
            const target = posts.find(p => p.id === c.postId);
            return (
              <div key={c.id} className="border-b border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {c.replyToCommentId ? "Respondeu a um comentário em " : "Comentou em "}
                  {target && visibleToViewer(target)
                    ? <Link href={postPath(target)} className="font-semibold text-primary hover:underline">{target.article?.title ?? (target.content.slice(0, 60) || "publicação")}</Link>
                    : <span>publicação indisponível</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
              </div>
            );
          })
        )}
        {activeTab === 3 && (
          !isMe ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground"><p className="text-sm">As curtidas de @{user.username} são privadas.</p></div>
          ) : likedPosts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground"><p className="text-sm">Você ainda não curtiu publicações.</p></div>
          ) : likedPosts.map(post => <PostCard key={post.id} post={post} />)
        )}
        {activeTab === 4 && (
          userArticles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <p className="text-sm">Nenhum artigo ainda.</p>
              {isMe && <Link href="/article/create" className="text-sm font-semibold text-primary hover:underline">Escrever artigo</Link>}
            </div>
          ) : userArticles.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
