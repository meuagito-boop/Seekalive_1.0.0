import { useEffect, useState } from "react";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";
import {
  MapPin,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessReviewsDialog } from "@/modules/seek/components/BusinessReviewsDialog";
import { CommercialProfileHero } from "@/modules/profile/commercial-profile/components/CommercialProfileHero";
import { CommercialProfileOverview } from "@/modules/profile/commercial-profile/components/CommercialProfileOverview";
import { CommercialProfileTopBar } from "@/modules/profile/commercial-profile/components/CommercialProfileTopBar";
import { businessMapUrl } from "@/modules/profile/commercial-profile/utils/businessMapUrl";
import { useSocial } from "@/modules/app/state/SocialContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { localActorId, useAccountScopedIds } from "@/modules/shared/storage/accountScopedStorage";
import { useToast } from "@/modules/shared/hooks/useToast";
import type { User } from "@/modules/profile/types/user";
import { buildProfileTimeline } from "@/modules/profile/utils/profileTimeline";
import { getProfileMedia } from "@/modules/shared/content/postMedia";
import { canReadPost } from "@/modules/shared/content/contentValidation";
import { handleTabKeyDown } from "@/modules/shared/ui/tabKeyboard";
import { formatWeeklyHours } from "@/modules/profile/commercial-profile/utils/businessHours";
import {
  calculateAverageBusinessRating,
  selectBusinessReviews,
} from "@/modules/seek/utils/businessReviews";
import { CommercialInfoTab } from "./CommercialInfoTab";
import { CommercialMediaTab, type CommercialMediaTabKey } from "./CommercialMediaTab";
import { CommercialReviewsTab } from "./CommercialReviewsTab";
import { CommercialArticlesTab } from "./CommercialArticlesTab";
import { CommercialPostsTab } from "./CommercialPostsTab";

const savedBusinessStorageKey = "seekalive-saved-businesses";
const profileTabs = ["Publicações", "Informações", "Avaliações", "Mídias", "Artigos"] as const;
type ProfileTab = (typeof profileTabs)[number];
const serviceOptions = [
  { key: "delivery", label: "Delivery", description: "Entrega no endereço informado." },
  { key: "dineIn", label: "Atendimento no local", description: "Recebe clientes no estabelecimento." },
  { key: "tableService", label: "Atendimento à mesa", description: "Oferece serviço nas mesas." },
  { key: "reservations", label: "Reservas", description: "Permite reservar um horário ou mesa." },
  { key: "appointments", label: "Agendamento", description: "Atendimento com horário marcado." },
  { key: "takeout", label: "Retirada no local", description: "Pedidos podem ser retirados no estabelecimento." },
] as const;

export function CommercialProfilePage({
  user,
  isMe,
}: {
  user: User;
  isMe: boolean;
}) {
  const { currentUser } = useAppContext();
  const { posts, reviews, repostEntries, getUserById, toggleFollow, blockUser } = useSocial();
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
  const postMedia = getProfileMedia(posts, user.id, isMe, user.isInCircle ?? false, user.isPrivate ?? false, user.isFollowing ?? false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Informações");
  const [activeMediaTab, setActiveMediaTab] = useState<CommercialMediaTabKey>("Fotos");
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { allReviews: allBusinessReviews, visibleReviews: businessReviews } =
    selectBusinessReviews(reviews, user.id, getUserById);
  const rating = allBusinessReviews.length
    ? calculateAverageBusinessRating(allBusinessReviews)
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
  const visiblePosts = posts.filter(post => {
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
      <CommercialProfileTopBar
        user={user}
        isMe={isMe}
        onShare={() => setShareOpen(true)}
        onBlock={() => {
          blockUser(user.id);
          toast({
            title: "Perfil bloqueado",
            description: "Os seguimentos e solicitações entre vocês foram removidos.",
          });
        }}
        onToggleFollow={() => void toggleFollow(user.id)}
      />

      <main className="mx-auto max-w-5xl">
        <CommercialProfileHero
          user={user}
          photos={photos}
          selectedPhoto={selectedPhoto}
          rating={rating}
          reviewCount={allBusinessReviews.length}
          onOpenReviews={() => {
            setActiveTab("Avaliações");
            setReviewsOpen(true);
          }}
          onShowPhotos={jumpToPhotos}
        />
        <CommercialProfileOverview
          user={user}
          openingHoursSummary={openingHoursSummary}
          isSaved={isSaved}
          onOpenReviews={() => setReviewsOpen(true)}
          onToggleSaved={toggleSaved}
        />

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
              <CommercialInfoTab
                user={user}
                commercial={commercial}
                offeredServices={offeredServices}
                openingHoursSummary={openingHoursSummary}
              />
            )}
          </div>

          <div id="commercial-profile-panel-3" role="tabpanel" aria-labelledby="commercial-profile-tab-3"
            hidden={activeTab !== "Mídias"} tabIndex={0}>
            {activeTab === "Mídias" && (
              <CommercialMediaTab
                user={user}
                photos={photos}
                videos={videos}
                activeTab={activeMediaTab}
                onTabChange={setActiveMediaTab}
                onPhotoSelect={(index) => {
                  setSelectedPhoto(index);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </div>

          <div id="commercial-profile-panel-2" role="tabpanel" aria-labelledby="commercial-profile-tab-2"
            hidden={activeTab !== "Avaliações"} tabIndex={0}>
            {activeTab === "Avaliações" && (
              <CommercialReviewsTab
                user={user}
                viewer={currentUser}
                allReviews={allBusinessReviews}
                visibleReviews={businessReviews}
                rating={rating}
                ratingCounts={ratingCounts}
                getUserById={getUserById}
                onOpenReview={() => setReviewsOpen(true)}
              />
            )}
          </div>

          <div id="commercial-profile-panel-4" role="tabpanel" aria-labelledby="commercial-profile-tab-4"
            hidden={activeTab !== "Artigos"} tabIndex={0}>
            {activeTab === "Artigos" && <CommercialArticlesTab displayName={user.displayName} articles={userArticles} />}
          </div>

          <div id="commercial-profile-panel-0" role="tabpanel" aria-labelledby="commercial-profile-tab-0"
            hidden={activeTab !== "Publicações"} tabIndex={0}>
            {activeTab === "Publicações" && <CommercialPostsTab displayName={user.displayName} timeline={timeline} />}
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
          <a href={businessMapUrl(commercial.address)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground no-underline">
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
