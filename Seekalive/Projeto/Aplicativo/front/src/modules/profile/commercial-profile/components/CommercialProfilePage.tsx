import { useEffect, useState } from "react";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";
import { Link } from "wouter";
import {
  ArrowLeft,
  Bookmark,
  Camera,
  MapPin,
  MoreHorizontal,
  Share2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessReviewsDialog } from "@/modules/seek/components/BusinessReviewsDialog";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { localActorId } from "@/modules/app/persistence/browserAccountStorage";
import { useAccountScopedIds } from "@/modules/app/hooks/useAccountScopedIds";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/modules/profile/types/user";
import { buildProfileTimeline } from "@/modules/profile/utils/profileTimeline";
import { getProfileMedia } from "@/lib/postMedia";
import { canReadPost } from "@/modules/social/application/contentValidation";
import { formatWeeklyHours } from "@/modules/profile/commercial-profile/utils/businessHours";
import { handleTabKeyDown } from "@/lib/tabKeyboard";
import { CommercialProfileContent } from "@/modules/profile/commercial-profile/components/CommercialProfileContent";
import { CommercialProfileInformation } from "@/modules/profile/commercial-profile/components/CommercialProfileInformation";
import { CommercialProfileMedia } from "@/modules/profile/commercial-profile/components/CommercialProfileMedia";
import { CommercialProfileReviews } from "@/modules/profile/commercial-profile/components/CommercialProfileReviews";
import { ProfileSocialStats } from "@/modules/profile/components/ProfileSocialStats";

const savedBusinessStorageKey = "seekalive-saved-businesses";
const profileTabs = ["Publicações", "Informações", "Avaliações", "Mídias", "Artigos"] as const;
type ProfileTab = (typeof profileTabs)[number];
type MediaTab = "Fotos" | "Vídeos";
const serviceOptions = [
  { key: "delivery", label: "Delivery", description: "Entrega no endereço informado." },
  { key: "dineIn", label: "Atendimento no local", description: "Recebe clientes no estabelecimento." },
  { key: "tableService", label: "Atendimento à mesa", description: "Oferece serviço nas mesas." },
  { key: "reservations", label: "Reservas", description: "Permite reservar um horário ou mesa." },
  { key: "appointments", label: "Agendamento", description: "Atendimento com horário marcado." },
  { key: "takeout", label: "Retirada no local", description: "Pedidos podem ser retirados no estabelecimento." },
] as const;

function priceLabel(level?: number) {
  return level ? "$".repeat(level) : "";
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function CommercialProfilePage({
  circleCount,
  user,
  isMe,
}: {
  circleCount: number;
  user: User;
  isMe: boolean;
}) {
  const { currentUser } = useAppContext();
  const { posts, remotePosts, reviews, repostEntries, getUserById, toggleFollow, blockUser } = useSocial();
  const { toast } = useToast();
  const { ids: savedIds, toggle: toggleSavedBusiness } = useAccountScopedIds(
    savedBusinessStorageKey,
    localActorId(currentUser?.id),
  );
  const commercial = user.commercialProfile;
  const openingHoursSummary = commercial?.weeklyHours
    ? formatWeeklyHours(commercial.weeklyHours)
    : commercial?.openingHours ?? "Horário não informado";
  const offeredServices = serviceOptions.filter(service => commercial?.serviceOptions?.[service.key] === true);
  const profilePosts = user.source === "server"
    ? remotePosts.filter((post) => post.authorId === user.id)
    : posts;
  const postMedia = getProfileMedia(profilePosts, user.id, isMe, user.isInCircle ?? false, user.isPrivate ?? false, user.isFollowing ?? false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Informações");
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>("Fotos");
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const allBusinessReviews = reviews
    .filter((review) => review.businessAccountId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const businessReviews = allBusinessReviews.filter(review => !getUserById(review.reviewerId)?.isBlocked);
  const rating = allBusinessReviews.length
    ? allBusinessReviews.reduce((total, review) => total + review.rating, 0) / allBusinessReviews.length
    : null;
  const ratingCounts = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: allBusinessReviews.filter((review) => review.rating === score).length,
  }));
  const photoUrls = [...new Set([
    ...(commercial?.photos ?? []),
    ...postMedia.filter((media) => media.type === "image").map((media) => media.url),
  ])];
  const photos = photoUrls.length ? photoUrls : [user.coverUrl];
  const videos = [...new Set([
    ...(commercial?.videos ?? []),
    ...postMedia.filter((media) => media.type === "video").map((media) => media.url),
  ])];
  const isSaved = savedIds.includes(user.id);
  const visiblePosts = profilePosts.filter(post => {
    if (user.source === "server" && post.source === "server") {
      const author = getUserById(post.authorId);
      return !!author && !author.isBlocked;
    }
    const author = getUserById(post.authorId);
    return !!author && !author.isBlocked && canReadPost(post, currentUser?.id, author.isInCircle ?? false, author.isPrivate ?? false, author.isFollowing ?? false);
  });
  const userPosts = visiblePosts.filter((post) => post.authorId === user.id);
  const userArticles = userPosts.filter((post) => post.format === "article");
  const timeline = buildProfileTimeline(visiblePosts, repostEntries, user.id, () => true);

  useEffect(() => {
    setSelectedPhoto(0);
  }, [user.id]);

  function toggleSaved() {
    toggleSavedBusiness(user.id);
  }

  function jumpToPhotos() {
    setActiveMediaTab("Fotos");
    setActiveTab("Mídias");
    window.setTimeout(() => {
      document.getElementById("merchant-media")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  if (!commercial) return null;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-lg">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign(`${import.meta.env.BASE_URL}feed`))}
            aria-label="Voltar"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Compartilhar perfil"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Share2 className="h-4 w-4" />
          </button>
          {!isMe && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(value => !value)}
                aria-label="Mais opções do perfil comercial"
                aria-expanded={showProfileMenu}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="button-more-commercial-profile"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      blockUser(user.id);
                      toast({
                        title: "Perfil bloqueado",
                        description: "Os seguimentos e solicitações entre vocês foram removidos.",
                      });
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/50"
                    data-testid="action-block-commercial-profile"
                  >
                    Bloquear perfil
                  </button>
                </div>
              )}
            </div>
          )}
          {isMe ? (
            <Button asChild variant="outline" className="h-8 rounded-full px-3 text-xs">
              <Link href="/profile/edit">Editar perfil</Link>
            </Button>
          ) : (
            <Button
              variant={user.isFollowing || user.followRequestSent ? "outline" : "default"}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => toggleFollow(user.id)}
            >
              {user.isFollowing ? "Seguindo" : user.followRequestSent ? "Cancelar solicitação" : user.isPrivate ? "Solicitar para seguir" : "Seguir"}
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        <section className="relative h-[250px] overflow-hidden bg-muted md:h-[370px]">
          <img
            src={photos[selectedPhoto] ?? user.coverUrl}
            alt={`Foto de ${user.displayName}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/20" />
          {commercial.isOpen !== undefined && (
            <div className="absolute left-4 top-4">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                commercial.isOpen ? "bg-emerald-500/90 text-white" : "bg-zinc-800/85 text-white"
              }`}>
                {commercial.isOpen ? "Aberto agora" : "Fechado"}
              </span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4 text-white md:bottom-6 md:left-8">
            <p className="mb-1 text-xs font-medium text-white/80">
              {priceLabel(commercial.priceLevel)}
              {commercial.priceLevel && <span className="mx-1.5">·</span>}
              {commercial.category}
            </p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black leading-tight md:text-4xl">{user.displayName}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-0.5" aria-label={rating === null ? "Sem avaliações" : `Nota ${rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5`}>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <Star
                        key={score}
                        className={`h-4 w-4 ${rating !== null && score <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-white/45"}`}
                      />
                    ))}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("Avaliações");
                      setReviewsOpen(true);
                    }}
                    className="text-sm font-semibold text-white underline-offset-2 hover:underline"
                  >
                    {rating === null ? "Sem avaliações" : `${rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${allBusinessReviews.length} ${allBusinessReviews.length === 1 ? "avaliação" : "avaliações"}`}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={jumpToPhotos}
                className="flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/65"
              >
                <Camera className="h-4 w-4" />
                Ver {photos.length} fotos
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold">{commercial.category}</span>
            {commercial.priceLevel && <span className="text-muted-foreground">· {priceLabel(commercial.priceLevel)}</span>}
            <span className="min-w-0 break-words text-muted-foreground">· {commercial.address}</span>
          </div>
          {user.bio.trim() && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {user.bio}
            </p>
          )}
          <div className="mt-3">
            <ProfileSocialStats
              circleCount={circleCount}
              isMe={isMe}
              profile={user}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            {commercial.isOpen !== undefined && (
              <span className={`font-semibold ${commercial.isOpen ? "text-emerald-500" : "text-muted-foreground"}`}>
                {commercial.isOpen ? "Aberto" : "Fechado"}
              </span>
            )}
            <span className="text-muted-foreground">
              {openingHoursSummary}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 pb-1">
            <Button
              onClick={() => setReviewsOpen(true)}
              className="h-10 shrink-0 rounded-full px-4"
            >
              <Star className="mr-2 h-4 w-4" />
              Adicionar avaliação
            </Button>
            <a
              href={mapsUrl(commercial.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-4 text-sm font-semibold text-foreground no-underline hover:bg-muted"
            >
              <MapPin className="h-4 w-4" />
              Mapa
            </a>
            <button
              type="button"
              onClick={toggleSaved}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              {isSaved ? "Salvo neste navegador" : "Salvar"}
            </button>
          </div>
        </section>

        <nav
          aria-label="Seções do perfil"
          className="sticky top-14 z-30 overflow-x-auto border-b border-border bg-background/95 backdrop-blur [scrollbar-width:none]"
        >
          <div role="tablist" aria-label="Seções do perfil comercial" className="flex h-12 w-full min-w-[560px] md:min-w-full">
            {profileTabs.map((tab, index) => (
              <button
                key={tab}
                id={`commercial-profile-tab-${index}`}
                aria-controls={`commercial-profile-panel-${index}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                tabIndex={activeTab === tab ? 0 : -1}
                onKeyDown={(event) => handleTabKeyDown(event, index, profileTabs.length, (nextIndex) => setActiveTab(profileTabs[nextIndex]))}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 whitespace-nowrap border-b-2 px-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-4 py-5 md:px-8">
          <div id="commercial-profile-panel-1" role="tabpanel" aria-labelledby="commercial-profile-tab-1"
            hidden={activeTab !== "Informações"} tabIndex={0}>
          {activeTab === "Informações" && (
            <CommercialProfileInformation
              commercial={commercial}
              offeredServices={offeredServices}
              openingHoursSummary={openingHoursSummary}
              user={user}
            />
          )}
          </div>

          <div id="commercial-profile-panel-3" role="tabpanel" aria-labelledby="commercial-profile-tab-3"
            hidden={activeTab !== "Mídias"} tabIndex={0}>
          {activeTab === "Mídias" && (
            <CommercialProfileMedia
              activeTab={activeMediaTab}
              displayName={user.displayName}
              onActiveTabChange={setActiveMediaTab}
              photos={photos}
              videos={videos}
              onSelectPhoto={(index) => {
                setSelectedPhoto(index);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
          </div>

          <div id="commercial-profile-panel-2" role="tabpanel" aria-labelledby="commercial-profile-tab-2"
            hidden={activeTab !== "Avaliações"} tabIndex={0}>
          {activeTab === "Avaliações" && (
            <CommercialProfileReviews
              allReviews={allBusinessReviews}
              business={user}
              getUserById={getUserById}
              onWriteReview={() => setReviewsOpen(true)}
              rating={rating}
              ratingCounts={ratingCounts}
              reviews={businessReviews}
              viewer={currentUser}
            />
          )}
          </div>

          <div id="commercial-profile-panel-4" role="tabpanel" aria-labelledby="commercial-profile-tab-4"
            hidden={activeTab !== "Artigos"} tabIndex={0}>
          {activeTab === "Artigos" && (
            <CommercialProfileContent
              articles={userArticles}
              profile={user}
              tab="Artigos"
              timeline={timeline}
            />
          )}
          </div>

          <div id="commercial-profile-panel-0" role="tabpanel" aria-labelledby="commercial-profile-tab-0"
            hidden={activeTab !== "Publicações"} tabIndex={0}>
          {activeTab === "Publicações" && (
            <CommercialProfileContent
              articles={userArticles}
              profile={user}
              tab="Publicações"
              timeline={timeline}
            />
          )}
          </div>
        </div>
      </main>

      <ShareContentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        reference={{ type: "seek_entity", id: user.id }}
        title={user.displayName}
        linkPath={`/profile/${user.username}`}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl gap-2">
          <Button onClick={() => setReviewsOpen(true)} className="flex-1 rounded-full">
            <Star className="mr-2 h-4 w-4" />
            Avaliar
          </Button>
          <a href={mapsUrl(commercial.address)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground no-underline">
            <MapPin className="h-4 w-4" />
            Mapa
          </a>
        </div>
      </div>

      <BusinessReviewsDialog
        business={user}
        open={reviewsOpen}
        onOpenChange={setReviewsOpen}
      />
    </div>
  );
}
