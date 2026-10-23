import { useEffect, useState } from "react";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";
import { Link } from "wouter";
import {
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
  Clock3,
  Film,
  Globe,
  MapPin,
  MoreHorizontal,
  Share2,
  Star,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post/PostCard";
import { BusinessReviewsDialog } from "@/components/seek/BusinessReviewsDialog";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { localActorId, useAccountScopedIds } from "@/data/accountScopedStorage";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/data/mockData";
import { getProfileMedia } from "@/lib/postMedia";
import { canReadPost } from "@/services/contentValidation";
import { formatWeeklyHours, weeklyHoursRows } from "@/lib/businessHours";

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

function ReviewEntry({
  review,
  viewer,
  business,
  getUserById,
}: {
  review: ReturnType<typeof useSocial>["reviews"][number];
  viewer: User | null;
  business: User;
  getUserById: ReturnType<typeof useSocial>["getUserById"];
}) {
  const reviewer = review.reviewerId === viewer?.id
    ? viewer
    : getUserById(review.reviewerId);

  return (
    <article className="border-b border-border py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={reviewer?.avatarUrl} alt="" />
          <AvatarFallback>{reviewer?.displayName?.[0] ?? "S"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {reviewer ? (
              <Link
                href={`/profile/${reviewer.username}`}
                className="text-sm font-semibold text-foreground no-underline hover:text-primary"
              >
                {reviewer.displayName}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-foreground">Conta Social</span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-0.5" aria-label={`Nota ${review.rating} de 5`}>
            {Array.from({ length: review.rating }, (_, index) => (
              <Star key={index} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {review.comment}
          </p>
          {review.businessReply && (
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-semibold text-foreground">
                Resposta de {business.displayName}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {review.businessReply.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

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
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>("Fotos");
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const businessReviews = reviews
    .filter((review) => review.businessAccountId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const rating = businessReviews.length
    ? businessReviews.reduce((total, review) => total + review.rating, 0) / businessReviews.length
    : null;
  const ratingCounts = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: businessReviews.filter((review) => review.rating === score).length,
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
  const timeline = [
    ...userPosts.map(post => ({ key: post.id, post, at: post.createdAt, repostedById: undefined as string | undefined })),
    ...repostEntries.filter(entry => entry.authorId === user.id).flatMap(entry => {
      const post = visiblePosts.find(item => item.id === entry.postId);
      return post ? [{ key: entry.id, post, at: entry.createdAt, repostedById: entry.authorId }] : [];
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));

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
                      toast({ title: "Perfil bloqueado", description: "Você não verá o conteúdo deste perfil." });
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
                    {rating === null ? "Sem avaliações" : `${rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${businessReviews.length} ${businessReviews.length === 1 ? "avaliação" : "avaliações"}`}
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
            {profileTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
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
          {activeTab === "Informações" && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <section>
                  <h2 className="text-lg font-bold">Sobre este lugar</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{user.bio}</p>
                  {commercial.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {commercial.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                {commercial.amenities && commercial.amenities.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-lg font-bold">Recursos e comodidades</h2>
                    <div className="flex flex-wrap gap-2">
                      {commercial.amenities.map((amenity) => (
                        <span key={amenity} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
                          <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h2 className="mb-3 text-lg font-bold">Serviços e formas de atendimento</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Confira como este comércio atende seus clientes.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {offeredServices.length > 0 ? offeredServices.map(service => (
                      <article key={service.key} className="rounded-2xl border border-border p-4">
                        <h3 className="font-semibold">{service.label}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                      </article>
                    )) : (
                      <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground sm:col-span-2">
                        Este perfil ainda não informou serviços oferecidos.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-2xl border border-border p-4">
                  <h2 className="mb-2 font-bold">Informações do comércio</h2>
                  <div className="divide-y divide-border">
                    {commercial.weeklyHours ? (
                      <div className="border-b border-border py-3 last:border-0">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                          Horário de funcionamento
                        </div>
                        <div className="space-y-1.5 pl-6">
                          {weeklyHoursRows(commercial.weeklyHours).map(row => (
                            <div key={row.label} className="flex justify-between gap-4 text-sm">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className="text-right">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <InfoLine icon={<Clock3 className="h-4 w-4" />} title="Horário de funcionamento" value={openingHoursSummary} />
                    )}
                    <InfoLine icon={<MapPin className="h-4 w-4" />} title="Endereço" value={commercial.address} href={mapsUrl(commercial.address)} />
                    <InfoLine icon={<Globe className="h-4 w-4" />} title="Site" value={user.website ?? "Não informado"} href={user.website} />
                    <InfoLine title="Faixa de preço" value={priceLabel(commercial.priceLevel) || "Não informada"} />
                  </div>
                </section>
              </aside>
            </div>
          )}

          {activeTab === "Mídias" && (
            <section id="merchant-media" className="max-w-4xl scroll-mt-32">
              <div className="mb-5">
                <h2 className="text-xl font-bold">Mídias de {user.displayName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Fotos e vídeos compartilhados por este comércio.</p>
              </div>
              <div role="tablist" aria-label="Tipo de mídia" className="mb-5 flex gap-2 border-b border-border">
                {(["Fotos", "Vídeos"] as const).map((mediaTab) => (
                  <button
                    key={mediaTab}
                    type="button"
                    role="tab"
                    aria-selected={activeMediaTab === mediaTab}
                    onClick={() => setActiveMediaTab(mediaTab)}
                    className={`border-b-2 px-4 py-3 text-sm font-semibold ${
                      activeMediaTab === mediaTab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mediaTab} ({mediaTab === "Fotos" ? photos.length : videos.length})
                  </button>
                ))}
              </div>

              {activeMediaTab === "Fotos" ? (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {photos.map((photo, index) => (
                    <button
                      type="button"
                      key={photo}
                      onClick={() => {
                        setSelectedPhoto(index);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="group relative h-36 overflow-hidden rounded-xl bg-muted md:h-52"
                      aria-label={`Exibir foto ${index + 1}`}
                    >
                      <img src={photo} alt={`${user.displayName}, foto ${index + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              ) : videos.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {videos.map((video) => (
                    <video key={video} src={video} controls playsInline className="aspect-video w-full rounded-xl bg-black" />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 text-center">
                  <Film className="h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">Ainda não há vídeos</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Os vídeos deste comércio aparecerão aqui.
                  </p>
                </div>
              )}
            </section>
          )}

          {activeTab === "Avaliações" && (
            <section className="max-w-3xl">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Avaliações de clientes</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Opiniões publicadas por contas do Seekalive.</p>
                </div>
                <Button onClick={() => setReviewsOpen(true)} className="rounded-full">
                  <Star className="mr-2 h-4 w-4" />
                  Escrever avaliação
                </Button>
              </div>

              <div className="mb-5 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[150px_1fr] sm:p-5">
                <div>
                  <p className="text-4xl font-black">{rating === null ? "—" : rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                  <div className="mt-1 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <Star key={score} className={`h-4 w-4 ${rating !== null && score <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{businessReviews.length} avaliações</p>
                </div>
                <div className="space-y-2">
                  {ratingCounts.map(({ score, count }) => (
                    <div key={score} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground">{score}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${businessReviews.length ? (count / businessReviews.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-5 text-right text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {businessReviews.length ? (
                businessReviews.map((review) => (
                  <ReviewEntry
                    key={review.id}
                    review={review}
                    viewer={currentUser}
                    business={user}
                    getUserById={getUserById}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
                  <p className="font-semibold">Ainda não há avaliações</p>
                  <p className="mt-1 text-sm text-muted-foreground">Compartilhe sua experiência para ajudar outras pessoas.</p>
                </div>
              )}
            </section>
          )}

          {activeTab === "Artigos" && (
            <section className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-xl font-bold">Artigos de {user.displayName}</h2>
              {userArticles.length ? userArticles.map((post) => <PostCard key={post.id} post={post} />) : (
                <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
                  Nenhum artigo publicado por este perfil. Artigos de outras pessoas sobre este lugar aparecem nos perfis delas.
                </div>
              )}
            </section>
          )}

          {activeTab === "Publicações" && (
            <section className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-xl font-bold">Publicações de {user.displayName}</h2>
              {timeline.length ? timeline.map(item => <PostCard key={item.key} post={item.post} repostedById={item.repostedById} />) : (
                <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
                  Este perfil comercial ainda não publicou nada no Social.
                </div>
              )}
            </section>
          )}
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

function InfoLine({
  icon,
  title,
  value,
  href,
}: {
  icon?: React.ReactNode;
  title: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-0.5 block break-words text-sm text-primary hover:underline">
            {value}
          </a>
        ) : (
          <p className="mt-0.5 break-words text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}
