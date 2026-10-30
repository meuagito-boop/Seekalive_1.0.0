import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { CommercialProfilePage } from "@/modules/profile/commercial-profile/components/CommercialProfilePage";
import { buildProfileTimeline } from "@/modules/profile/utils/profileTimeline";
import { PersonalProfileHeader } from "@/modules/profile/personal-profile/components/PersonalProfileHeader";
import { PersonalProfileTabs } from "@/modules/profile/personal-profile/components/PersonalProfileTabs";
import { getProfileMedia } from "@/lib/postMedia";
import { canReadPost } from "@/modules/social/application/contentValidation";
import { UnavailableState } from "@/components/content/StateBlocks";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileRetry, setProfileRetry] = useState(0);
  const [profileContentLoading, setProfileContentLoading] = useState(false);
  const [profileContentCursor, setProfileContentCursor] = useState<string | null>(null);
  const [profileContentError, setProfileContentError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    users,
    posts,
    remotePosts,
    repostEntries,
    postComments,
    toggleFollow,
    blockUser,
    unblockUser,
    loadRemoteProfile,
    loadRemoteProfileContent,
  } = useSocial();
  const { currentUser: signedInUser, isDevelopmentPreview } = useAppContext();
  const viewer = signedInUser;
  const username = params.username;
  const isMe = !!viewer && (username === viewer.username || !username);
  const isRemoteSocialSession = Boolean(signedInUser && !isDevelopmentPreview);
  const remoteUser = isRemoteSocialSession && !isMe
    ? users.find((user) => user.username === username && user.source === "server")
    : undefined;

  useEffect(() => {
    if (!isRemoteSocialSession || isMe || !username || remoteUser) {
      setProfileLoading(false);
      setProfileLoadError(null);
      return;
    }

    let active = true;
    setProfileLoading(true);
    setProfileLoadError(null);
    loadRemoteProfile(username)
      .then((user) => {
        if (active && !user) setProfileLoadError("Perfil indisponível.");
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileLoadError(error instanceof Error ? error.message : "Não foi possível carregar o perfil.");
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, isMe, username, remoteUser?.id, profileRetry, loadRemoteProfile]);

  const contentAccountId = isMe ? viewer?.id : remoteUser?.id;
  useEffect(() => {
    if (!isRemoteSocialSession || !contentAccountId) return;
    let active = true;
    setProfileContentLoading(true);
    setProfileContentError(null);
    setProfileContentCursor(null);
    loadRemoteProfileContent(contentAccountId)
      .then((page) => {
        if (active) setProfileContentCursor(page.nextCursor);
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileContentError(error instanceof Error ? error.message : "Não foi possível carregar as publicações.");
        }
      })
      .finally(() => {
        if (active) setProfileContentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, contentAccountId, profileRetry, loadRemoteProfileContent]);

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
  const found = isMe
    ? viewer
    : isRemoteSocialSession
      ? remoteUser
      : users.find((user) => user.username === username);
  if (!found) {
    return (
      <UnavailableState
        title={profileLoading ? "Carregando perfil" : "Perfil indisponível"}
        description={profileLoading
          ? "Buscando os dados atualizados da conta."
          : profileLoadError ?? `Não encontramos @${username}. A conta pode ter sido removida.`}
        action={profileLoading
          ? undefined
          : profileLoadError
            ? <Button variant="outline" onClick={() => setProfileRetry((value) => value + 1)}>Tentar novamente</Button>
            : <Link href="/feed" className="text-sm font-semibold text-primary hover:underline">Voltar ao feed</Link>}
      />
    );
  }
  const user = found;
  const profilePosts =
    isRemoteSocialSession && user.source === "server"
      ? remotePosts.filter((post) => post.authorId === user.id)
      : posts;

  const following = user.isFollowing ?? false;
  const followRequested = user.followRequestSent ?? false;
  const inCircle = user.isInCircle ?? false;
  const circleCount = isMe ? users.filter(candidate => candidate.isInCircle).length : user.stats.circles;

  // Posts filtered to this user
  const visibleToViewer = (p: (typeof profilePosts)[number]) => {
    const author = users.find(u => u.id === p.authorId) ?? (p.authorId === viewer.id ? viewer : undefined);
    if (isRemoteSocialSession && p.source === "server") {
      return !!author && !author.isBlocked;
    }
    return !!author && !author.isBlocked && canReadPost(p, viewer.id, author.isInCircle ?? false, author.isPrivate ?? false, author.isFollowing ?? false);
  };
  // Authored posts plus repost distribution records (original author preserved).
  const timeline = buildProfileTimeline(profilePosts, repostEntries, user.id, visibleToViewer);
  const userArticles = profilePosts.filter(p => p.authorId === user.id && p.format === "article" && visibleToViewer(p));
  const userComments = postComments.filter(c => {
    const target = profilePosts.find(post => post.id === c.postId);
    return c.authorId === user.id && !!target && visibleToViewer(target);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const likedPosts = isMe ? profilePosts.filter(p => p.isLiked && visibleToViewer(p)) : [];
  const userMedia = getProfileMedia(profilePosts, user.id, isMe, user.isInCircle ?? false, user.isPrivate ?? false, user.isFollowing ?? false);

  async function loadMoreProfileContent() {
    if (!profileContentCursor || profileContentLoading) return;
    setProfileContentLoading(true);
    setProfileContentError(null);
    try {
      const page = await loadRemoteProfileContent(user.id, profileContentCursor);
      setProfileContentCursor(page.nextCursor);
    } catch (error) {
      setProfileContentError(error instanceof Error ? error.message : "Não foi possível carregar mais publicações.");
    } finally {
      setProfileContentLoading(false);
    }
  }

  const moreContentControl = isRemoteSocialSession ? (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-2 px-4 py-4">
      {profileContentError && <p className="text-sm text-destructive" role="alert">{profileContentError}</p>}
      {profileContentCursor && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadMoreProfileContent()}
          disabled={profileContentLoading}
        >
          {profileContentLoading ? "Carregando…" : "Carregar mais publicações"}
        </Button>
      )}
    </div>
  ) : null;

  function handleFollow() {
    if (isMe || user.isBlocked) return;
    void toggleFollow(user.id);
  }

  async function handleBlockToggle(): Promise<boolean> {
    const wasBlockedByViewer = Boolean(user.isBlockedByViewer);
    const updated = wasBlockedByViewer
      ? await unblockUser(user.id)
      : await blockUser(user.id);
    if (!updated) return false;
    if (wasBlockedByViewer) {
      toast({
        title: "Seu bloqueio foi removido",
        description: user.blocksViewer
          ? "Esta conta também bloqueou você; os seguimentos removidos não serão restaurados."
          : "Os seguimentos removidos não serão restaurados automaticamente.",
      });
    } else {
      toast({
        title: "Perfil bloqueado",
        description: "Os seguimentos e solicitações entre vocês foram removidos.",
      });
    }
    return true;
  }

  function handleCopyProfileLink() {
    const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/profile/${user.username}`;
    navigator.clipboard?.writeText(url).then(
      () => toast({ title: "Link do perfil copiado" }),
      () => toast({ title: "Não foi possível copiar o link", variant: "destructive" }),
    );
  }

  if (!isMe && user.isBlocked) {
    const blockedByViewer = !!user.isBlockedByViewer;
    const mutualBlock = blockedByViewer && !!user.blocksViewer;
    return (
      <UnavailableState
        title={mutualBlock ? "Bloqueio mútuo" : blockedByViewer ? "Perfil bloqueado" : "Perfil indisponível"}
        description={mutualBlock
          ? "Você bloqueou esta conta e ela também bloqueou você. Remover o seu bloqueio não remove o bloqueio iniciado pela outra conta."
          : blockedByViewer
            ? "Você bloqueou este perfil. Perfis, conteúdos e interações entre vocês estão indisponíveis para ambos."
          : "Esta conta bloqueou o seu perfil. Perfis, conteúdos e interações entre vocês estão indisponíveis."}
        action={blockedByViewer
          ? <Button variant="outline" onClick={handleBlockToggle}>{mutualBlock ? "Remover meu bloqueio" : "Desbloquear perfil"}</Button>
          : undefined}
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
            onClick={async () => {
              const updated = await blockUser(user.id);
              if (!updated) return;
              toast({
                title: "Perfil bloqueado",
                description: "Os seguimentos e solicitações entre vocês foram removidos.",
              });
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
    return (
      <>
        <CommercialProfilePage
          circleCount={circleCount}
          user={user}
          isMe={isMe}
        />
        {moreContentControl}
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <PersonalProfileHeader
        circleCount={circleCount}
        following={following}
        followRequested={followRequested}
        inCircle={inCircle}
        isMe={isMe}
        onBack={() =>
          window.history.length > 1
            ? window.history.back()
            : setLocation("/feed")
        }
        onBlockToggle={handleBlockToggle}
        onCopyProfileLink={handleCopyProfileLink}
        onFollow={handleFollow}
        profile={user}
        publicationCount={timeline.length}
      />

      <PersonalProfileTabs
        activeTab={activeTab}
        isMe={isMe}
        likedPosts={likedPosts}
        media={userMedia}
        posts={profilePosts}
        profile={user}
        isPostReadable={visibleToViewer}
        setActiveTab={setActiveTab}
        timeline={timeline}
        userArticles={userArticles}
        userComments={userComments}
      />
      {moreContentControl}
    </div>
  );
}
