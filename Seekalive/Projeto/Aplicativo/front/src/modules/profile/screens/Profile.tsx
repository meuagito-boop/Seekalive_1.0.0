import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useSocial } from "@/modules/app/state/SocialContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { CommercialProfilePage } from "@/modules/profile/commercial-profile/components/CommercialProfilePage";
import { PersonalProfileTabs } from "@/modules/profile/personal-profile/components/PersonalProfileTabs";
import { buildProfileTimeline } from "@/modules/profile/utils/profileTimeline";
import { getProfileMedia } from "@/modules/shared/content/postMedia";
import { canReadPost } from "@/modules/shared/content/contentValidation";
import { UnavailableState } from "@/components/content/StateBlocks";
import { useToast } from "@/modules/shared/hooks/useToast";
import { useRemoteProfile } from "@/modules/profile/hooks/useRemoteProfile";
import { ProfileAccessState } from "@/modules/profile/personal-profile/components/ProfileAccessState";
import { PersonalProfileHeader } from "@/modules/profile/personal-profile/components/PersonalProfileHeader";

export default function Profile() {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const { toast } = useToast();

  const {
    users,
    posts,
    repostEntries,
    postComments,
    toggleFollow,
    blockUser,
    unblockUser,
    loadRemoteProfile,
  } = useSocial();
  const { currentUser: signedInUser, isDevelopmentPreview } = useAppContext();
  const viewer = signedInUser;
  const username = params.username;
  const isMe = !!viewer && (username === viewer.username || !username);
  const isRemoteSocialSession = Boolean(signedInUser && !isDevelopmentPreview);
  const remoteUser = isRemoteSocialSession && !isMe
    ? users.find((user) => user.username === username && user.source === "server")
    : undefined;
  const remoteProfile = useRemoteProfile({
    username,
    isRemoteSocialSession,
    isMe,
    remoteUser,
    loadRemoteProfile,
  });

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
        title={remoteProfile.isLoading ? "Carregando perfil" : "Perfil indisponível"}
        description={remoteProfile.isLoading
          ? "Buscando os dados atualizados da conta."
          : remoteProfile.error ?? `Não encontramos @${username}. A conta pode ter sido removida.`}
        action={remoteProfile.isLoading
          ? undefined
          : remoteProfile.error
            ? <Button variant="outline" onClick={remoteProfile.retry}>Tentar novamente</Button>
            : <Link href="/feed" className="text-sm font-semibold text-primary hover:underline">Voltar ao feed</Link>}
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
  const timeline = buildProfileTimeline(posts, repostEntries, user.id, visibleToViewer);
  const userArticles = posts.filter(p => p.authorId === user.id && p.format === "article" && visibleToViewer(p));
  const userComments = postComments.filter(c => {
    const target = posts.find(post => post.id === c.postId);
    return c.authorId === user.id && !!target && visibleToViewer(target);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const likedPosts = isMe ? posts.filter(p => p.isLiked && visibleToViewer(p)) : [];
  const userMedia = getProfileMedia(posts, user.id, isMe, user.isInCircle ?? false, user.isPrivate ?? false, user.isFollowing ?? false);

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

  async function handlePrivateBlock() {
    const updated = await blockUser(user.id);
    if (!updated) return;
    toast({
      title: "Perfil bloqueado",
      description: "Os seguimentos e solicitações entre vocês foram removidos.",
    });
  }

  if (!isMe && user.isBlocked) {
    return (
      <ProfileAccessState
        user={user}
        isMe={isMe}
        following={following}
        followRequested={followRequested}
        onFollow={handleFollow}
        onBlock={() => void handlePrivateBlock()}
        onUnblock={() => void handleBlockToggle()}
      />
    );
  }

  if (!isMe && user.isPrivate && !following) {
    return (
      <ProfileAccessState
        user={user}
        isMe={isMe}
        following={following}
        followRequested={followRequested}
        onFollow={handleFollow}
        onBlock={() => void handlePrivateBlock()}
        onUnblock={() => void handleBlockToggle()}
      />
    );
  }

  if (user.accountType === "commercial" && user.commercialProfile) {
    return <CommercialProfilePage user={user} isMe={isMe} />;
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <PersonalProfileHeader
        user={user}
        isMe={isMe}
        postCount={timeline.length}
        inCircle={inCircle}
        following={following}
        followRequested={followRequested}
        circleCount={circleCount}
        onBack={() => (window.history.length > 1 ? window.history.back() : setLocation("/feed"))}
        onFollow={handleFollow}
        onBlockToggle={handleBlockToggle}
      />

      <PersonalProfileTabs
        user={user}
        isMe={isMe}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        timeline={timeline}
        userComments={userComments}
        posts={posts}
        visibleToViewer={visibleToViewer}
        userMedia={userMedia}
        likedPosts={likedPosts}
        userArticles={userArticles}
      />
    </div>
  );
}
