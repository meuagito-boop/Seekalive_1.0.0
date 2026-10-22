import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search, MapPin, Star, Clock, Calendar, Bookmark, Eye, ChevronRight, Utensils, Wine, Coffee, ShoppingBag, Briefcase, Heart, Smile, Filter, X } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";
import type { User } from "@/data/mockData";
import { BusinessReviewsDialog } from "@/components/seek/BusinessReviewsDialog";
import { demoSeekEvents as mockEvents, demoNearbyEvents as nearbyEvents } from "@/data/demoSeekEvents";
import type { SeekEvent } from "@/types/content";
import { filterSeekBusinesses, matchesSeekSearch } from "@/lib/seekFilters";

type SeekBusiness = {
  id: string;
  username: string;
  name: string;
  bio: string;
  categoryKey: string;
  category: string;
  address: string;
  distanceKm?: number;
  distance: string;
  open?: boolean;
  rating?: number;
  reviews?: number;
  img: string;
  tags: string[];
  followers: number;
};

function toSeekBusiness(user: User): SeekBusiness | null {
  const profile = user.commercialProfile;
  if (user.accountType !== "commercial" || !profile) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.displayName,
    bio: user.bio,
    categoryKey: profile.categoryKey,
    category: profile.category,
    address: profile.address,
    distanceKm: Number.isFinite(profile.distanceKm) && profile.distanceKm! >= 0 ? profile.distanceKm : undefined,
    distance: !Number.isFinite(profile.distanceKm) || profile.distanceKm! < 0
      ? "Distância não informada"
      : `${profile.distanceKm!.toLocaleString("pt-BR")} km · distância informada`,
    open: profile.isOpen,
    img: user.coverUrl || user.avatarUrl,
    tags: profile.tags,
    followers: user.stats.followers,
  };
}

const categories = [
  { label: "Restaurantes",    icon: Utensils,  key: "restaurantes" },
  { label: "Bares",           icon: Wine,      key: "bares" },
  { label: "Cafés",           icon: Coffee,    key: "cafes" },
  { label: "Eventos",         icon: Calendar,  key: "eventos" },
  { label: "Serviços",        icon: Briefcase, key: "servicos" },
  { label: "Compras",         icon: ShoppingBag, key: "compras" },
  { label: "Saúde e beleza",  icon: Heart,     key: "saude" },
  { label: "Lazer",           icon: Smile,     key: "lazer" },
  { label: "Menor distância", icon: MapPin,    key: "proximos" },
  { label: "Abertos agora",   icon: Clock,     key: "abertos" },
];


function readSavedBusinesses(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    console.warn("Could not read saved Seek businesses from this browser.");
    return [];
  }
}

function CategoryChip({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function BusinessCard({
  b,
  saved,
  onToggleSave,
  onOpenReviews,
}: {
  b: SeekBusiness;
  saved: boolean;
  onToggleSave: () => void;
  onOpenReviews: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group">
      <div className="relative h-36 overflow-hidden">
        <img
          src={b.img}
          alt={b.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span
          className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            b.open
              ? "bg-green-500/90 text-white"
              : "bg-zinc-700/90 text-zinc-300"
          }`}
        >
          {b.open === undefined ? "Perfil comercial" : b.open ? "Aberto agora" : "Fechado"}
        </span>
        <button
          onClick={onToggleSave}
          aria-label={saved ? `Remover ${b.name} dos salvos` : `Salvar ${b.name}`}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Bookmark
            className={`w-4 h-4 ${saved ? "fill-primary text-primary" : "text-white"}`}
          />
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="font-semibold text-sm text-foreground leading-tight">{b.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{b.category}</p>
          </div>
          <button
            type="button"
            onClick={onOpenReviews}
            aria-label={b.rating === undefined ? `Avaliar ${b.name}` : `Ver ${b.reviews} avaliações de ${b.name}`}
            className="flex items-center gap-0.5 flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {b.rating !== undefined ? (
              <>
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold text-foreground">{b.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">({b.reviews ?? 0})</span>
              </>
            ) : (
              <>
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-primary">Avaliar</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground">{b.distance}</span>
          <span className="mx-1 text-border">·</span>
          <div className="flex gap-1 overflow-hidden">
            {b.tags.map((t) => (
              <span key={t} className="text-[10px] text-muted-foreground/80">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/profile/${b.username}`}
            className="flex-1 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1 no-underline"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver perfil Social
          </Link>
        </div>
      </div>
    </div>
  );
}

function EventCard({ e }: { e: SeekEvent }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group">
      <div className="relative h-28 overflow-hidden">
        <img
          src={e.img}
          alt={e.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-2 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground">
          {e.price}
        </span>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm text-foreground leading-tight mb-0.5">{e.name}</p>
        <div className="flex items-center gap-1 mb-0.5">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{e.date}</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{e.venue}</span>
          <span className="mx-1 text-border">·</span>
          <span className="text-[11px] text-primary font-medium">{e.interested} interessados</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/seek/event/${e.id}`} className="flex-1 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center no-underline">
            Ver evento
          </Link>
          <button
            onClick={() => setSaved((s) => !s)}
            aria-label={saved ? `Remover ${e.name} dos salvos` : `Salvar ${e.name}`}
            className="h-7 px-3 rounded-full border border-border text-xs text-muted-foreground font-semibold hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground flex-1">{title}</h3>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function Seek() {
  const { users, reviews } = useSocial();
  const { currentUser } = useAppContext();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"comercios" | "eventos">("comercios");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sortNearest, setSortNearest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minimumRating, setMinimumRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0);
  const [savedBusinessIds, setSavedBusinessIds] = useState<string[]>(() => readSavedBusinesses("seekalive-saved-businesses"));
  const [reviewBusinessId, setReviewBusinessId] = useState<string | null>(null);

  const commercialProfiles = users
    .filter((user) => !user.isBlocked)
    .map(toSeekBusiness)
    .filter((business): business is SeekBusiness => business !== null);
  const commercialAccounts = commercialProfiles.map((business) => {
    const businessReviews = reviews.filter((review) => review.businessAccountId === business.id);
    const rating = businessReviews.length
      ? businessReviews.reduce((total, review) => total + review.rating, 0) / businessReviews.length
      : undefined;
    return { ...business, rating, reviews: businessReviews.length };
  });
  const reviewBusiness = users.find(
    (user) => user.id === reviewBusinessId && user.accountType === "commercial",
  ) ?? null;
  const filteredBusinesses = filterSeekBusinesses(commercialAccounts, {
    query: searchTerm, category: activeCategory, onlyOpen, minimumRating, maxDistance, nearest: sortNearest,
  });

  const filteredEvents = mockEvents.filter((event) => {
    if (activeCategory && !["proximos", "abertos", "eventos"].includes(activeCategory) && event.categoryKey !== activeCategory) return false;
    if (event.organizerId && !commercialAccounts.some((account) => account.id === event.organizerId)) return false;
    return matchesSeekSearch([event.name, event.venue, event.date, event.price], searchTerm);
  });

  const trendingPlaces = [...commercialAccounts]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);
  const featuredMerchants = [...commercialAccounts]
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 2);

  useEffect(() => {
    try {
      window.localStorage.setItem("seekalive-saved-businesses", JSON.stringify(savedBusinessIds));
    } catch {
      console.warn("Could not save Seek businesses in this browser.");
    }
  }, [savedBusinessIds]);

  function toggleSavedBusiness(id: string) {
    setSavedBusinessIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]
    );
  }

  function openReviews(businessId: string) {
    setReviewBusinessId(businessId);
  }

  function selectCategory(key: string) {
    if (key === "eventos") {
      setActiveTab("eventos");
      setActiveCategory(null);
      setOnlyOpen(false);
      setSortNearest(false);
      return;
    }
    if (key === "abertos") {
      setActiveTab("comercios");
      setOnlyOpen((value) => !value);
      setActiveCategory(null);
      return;
    }
    if (key === "proximos") {
      setActiveTab("comercios");
      setSortNearest((value) => !value);
      setActiveCategory(null);
      return;
    }
    setActiveTab("comercios");
    setActiveCategory((current) => current === key ? null : key);
  }

  function selectTab(tab: "comercios" | "eventos") {
    setActiveTab(tab);
    setActiveCategory(null);
    setOnlyOpen(false);
    setSortNearest(false);
    setMinimumRating(0);
    setMaxDistance(0);
  }

  function clearFilters() {
    setMinimumRating(0);
    setMaxDistance(0);
    setOnlyOpen(false);
    setActiveCategory(null);
    setSortNearest(false);
  }

  function renderFilters(suffix: string) {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm font-medium" htmlFor={`seek-rating-${suffix}`}>
          Nota mínima
          <select id={`seek-rating-${suffix}`} value={minimumRating} onChange={(e) => setMinimumRating(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value={0}>Qualquer nota</option><option value={4}>4,0 ou mais</option><option value={4.5}>4,5 ou mais</option>
          </select>
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm font-medium" htmlFor={`seek-distance-${suffix}`}>
          Distância informada
          <select id={`seek-distance-${suffix}`} value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value={0}>Qualquer distância</option><option value={1}>Até 1 km</option><option value={5}>Até 5 km</option><option value={10}>Até 10 km</option><option value={25}>Até 25 km</option>
          </select>
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm font-medium" htmlFor={`seek-order-${suffix}`}>
          Ordenar por
          <select id={`seek-order-${suffix}`} value={sortNearest ? "distance" : "rating"} onChange={(e) => setSortNearest(e.target.value === "distance")}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="rating">Melhores avaliações</option><option value="distance">Menor distância informada</option>
          </select>
        </label>
        <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/10">Limpar filtros</button>
        <p className="w-full text-xs text-muted-foreground">As distâncias são as informadas nos cadastros, não calculadas pela sua localização atual.</p>
      </div>
    );
  }

  function isCategoryActive(key: string) {
    if (key === "eventos") return activeTab === "eventos";
    if (key === "abertos") return onlyOpen;
    if (key === "proximos") return sortNearest;
    return activeCategory === key;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-3 md:px-4 pt-3">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar comércios, serviços e eventos..."
            aria-label="Buscar comércios, serviços e eventos"
            className="w-full h-10 pl-9 pr-10 bg-muted/60 border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Perfis comerciais da rede Social
        </p>
      </div>

      {/* Mobile categories + tab */}
      <div className="md:hidden">
        <div className="flex gap-2 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <CategoryChip
              key={c.key}
              icon={c.icon}
              label={c.label}
              active={isCategoryActive(c.key)}
              onClick={() => selectCategory(c.key)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center border-b border-border px-3 gap-2">
          <button
            onClick={() => selectTab("comercios")}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "comercios" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            Comércios
          </button>
          <button
            onClick={() => selectTab("eventos")}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "eventos" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            Eventos
          </button>
          {activeTab === "comercios" && (
            <button
              onClick={() => selectCategory("abertos")}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                onlyOpen ? "bg-green-500/15 text-green-400 border-green-500/30" : "text-muted-foreground border-border"
              }`}
            >
              Abertos
            </button>
          )}
          {activeTab === "comercios" && (
            <button
              onClick={() => setShowFilters((value) => !value)}
              aria-label="Abrir filtros"
              aria-expanded={showFilters}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                showFilters || minimumRating > 0 || maxDistance > 0
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border"
              }`}
            >
              <Filter className="w-3 h-3" />
              Filtros
            </button>
          )}
        </div>
        {showFilters && activeTab === "comercios" && (
          <div className="mx-3 mt-3 rounded-xl border border-border bg-card p-3">
            {renderFilters("mobile")}
          </div>
        )}
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {activeTab === "comercios"
            ? `${filteredBusinesses.length} perfis comerciais`
            : `${filteredEvents.length} eventos`}
        </div>
        <div className="p-3 grid grid-cols-1 gap-3">
          {activeTab === "comercios" ? (
            filteredBusinesses.length ? filteredBusinesses.map((business) => (
              <BusinessCard
                key={business.id}
                b={business}
                saved={savedBusinessIds.includes(business.id)}
                onToggleSave={() => toggleSavedBusiness(business.id)}
                onOpenReviews={() => openReviews(business.id)}
              />
            )) : (
              <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-muted-foreground">
                <p className="font-semibold text-sm">Nenhum perfil comercial encontrado</p>
                <p className="mt-1 text-xs">Ajuste sua busca ou remova alguns filtros.</p>
              </div>
            )
          ) : filteredEvents.length ? filteredEvents.map((event) => (
            <EventCard key={event.id} e={event} />
          )) : (
            <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-muted-foreground">
              <p className="font-semibold text-sm">Nenhum evento encontrado</p>
              <p className="mt-1 text-xs">Tente outra busca ou categoria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop 3-column layout */}
      <div className="hidden md:flex max-w-6xl mx-auto px-4 pt-4 gap-4 items-start">

        {/* Left: categories + quick stats */}
        <aside className="w-52 flex-shrink-0 sticky top-[108px] self-start space-y-3">
          {/* Quick stats */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-foreground">Explorar comércios</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="px-3 py-2.5 text-center">
                <p className="text-xl font-black text-foreground">{commercialAccounts.filter((business) => business.open === true).length}</p>
                <p className="text-[10px] text-green-400 font-medium">abertos agora</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-xl font-black text-foreground">{mockEvents.length}</p>
                <p className="text-[10px] text-primary font-medium">eventos hoje</p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Categorias</p>
            </div>
            <nav className="py-1">
              {categories.map((c) => {
                const Icon = c.icon;
                const active = isCategoryActive(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => selectCategory(c.key)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                      active
                        ? "text-primary font-semibold bg-primary/8"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {c.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Center: main content */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-120px)]">
          {/* Tab selector + filters */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => selectTab("comercios")}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "comercios"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Comércios
              </button>
              <button
                onClick={() => selectTab("eventos")}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "eventos"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Eventos
              </button>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "comercios" && (
                <button
                  onClick={() => selectCategory("abertos")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    onlyOpen
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Aberto agora
                </button>
              )}
              {activeTab === "comercios" && <button
                onClick={() => setShowFilters((value) => !value)}
                aria-expanded={showFilters}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
                  showFilters || minimumRating > 0 || maxDistance > 0
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
              </button>}
            </div>
          </div>

          {showFilters && activeTab === "comercios" && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              {renderFilters("desktop")}
            </div>
          )}

          <p className="mb-3 text-xs text-muted-foreground">
            {activeTab === "comercios"
              ? `${filteredBusinesses.length} perfis comerciais`
              : `${filteredEvents.length} eventos`}
            {searchTerm && ` para “${searchTerm}”`}
          </p>

          {activeTab === "comercios" && (
            <>
              {/* Featured card — first result, full width */}
              {filteredBusinesses.length > 0 && (
                <div className="mb-4">
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group">
                    <div className="flex gap-0">
                      <div className="relative w-56 flex-shrink-0 overflow-hidden">
                        <img
                          src={filteredBusinesses[0].img}
                          alt={filteredBusinesses[0].name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 min-h-[160px]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
                        {filteredBusinesses[0].open !== undefined && (
                          <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            filteredBusinesses[0].open ? "bg-green-500/90 text-white" : "bg-zinc-700/90 text-zinc-300"
                          }`}>
                            {filteredBusinesses[0].open ? "Aberto agora" : "Fechado"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">⭐ Destaque</span>
                              <h3 className="font-bold text-foreground text-lg leading-tight">{filteredBusinesses[0].name}</h3>
                              <p className="text-xs text-muted-foreground">{filteredBusinesses[0].category}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openReviews(filteredBusinesses[0].id)}
                              aria-label={filteredBusinesses[0].rating === undefined
                                ? `Avaliar ${filteredBusinesses[0].name}`
                                : `Ver ${filteredBusinesses[0].reviews} avaliações de ${filteredBusinesses[0].name}`}
                              className="flex items-center gap-0.5 flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              {filteredBusinesses[0].rating !== undefined ? (
                                <>
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm font-bold text-foreground">{filteredBusinesses[0].rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                <span className="text-xs text-muted-foreground ml-1">({filteredBusinesses[0].reviews ?? 0})</span>
                                </>
                              ) : (
                                <>
                                  <Star className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-primary">Avaliar</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{filteredBusinesses[0].distance}</span>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {filteredBusinesses[0].tags.map(t => (
                              <span key={t} className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Link
                            href={`/profile/${filteredBusinesses[0].username}`}
                            className="flex-1 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 no-underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver perfil Social
                          </Link>
                          <button
                            onClick={() => toggleSavedBusiness(filteredBusinesses[0].id)}
                            className="h-8 px-4 rounded-full border border-border text-xs text-muted-foreground font-semibold hover:border-primary/40 hover:text-foreground transition-colors"
                          >
                            {savedBusinessIds.includes(filteredBusinesses[0].id) ? "Salvo" : "Salvar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Remaining cards in 2-col grid */}
              <div className="grid grid-cols-2 gap-4">
                {filteredBusinesses.slice(1).map((business) => (
                  <BusinessCard
                    key={business.id}
                    b={business}
                    saved={savedBusinessIds.includes(business.id)}
                    onToggleSave={() => toggleSavedBusiness(business.id)}
                    onOpenReviews={() => openReviews(business.id)}
                  />
                ))}
              </div>
              {filteredBusinesses.length === 0 && (
                <div className="flex flex-col items-center py-16 text-muted-foreground">
                  <Search className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-semibold text-sm">Nenhum perfil comercial encontrado</p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      clearFilters();
                    }}
                    className="text-primary text-xs mt-2 hover:underline"
                  >
                    Limpar busca e filtros
                  </button>
                </div>
              )}
            </>
          )}
          {activeTab === "eventos" && (
            <div className="grid grid-cols-2 gap-4">
              {filteredEvents.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
              {!filteredEvents.length && (
                <div role="status" className="col-span-2 rounded-xl border border-border bg-card px-5 py-12 text-center text-muted-foreground">
                  <p className="font-semibold">Nenhum evento encontrado</p>
                  <p className="mt-1 text-sm">Tente outra busca ou remova os filtros.</p>
                  <button type="button" className="mt-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10"
                    onClick={() => { setSearchTerm(""); clearFilters(); }}>Limpar busca e filtros</button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right: context panel */}
        <aside className="w-72 flex-shrink-0 sticky top-[108px] self-start max-h-[calc(100vh-112px)] overflow-y-auto">

          <PanelCard title="Eventos para explorar" icon={<Calendar className="w-4 h-4" />}>
            {nearbyEvents.map((ev) => (
              <Link key={ev.id} href={`/seek/event/${ev.id}`} className="block px-4 py-2.5 hover:bg-muted/30 transition-colors border-b border-border last:border-0 no-underline">
                <p className="text-xs font-semibold text-foreground">{ev.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ev.date} · {ev.venue}</p>
                <p className="text-[11px] text-primary mt-0.5">{ev.interested} interessados</p>
              </Link>
            ))}
          </PanelCard>

          <PanelCard title="Lugares em alta" icon={<MapPin className="w-4 h-4" />}>
            {trendingPlaces.map((business) => (
              <Link
                key={business.id}
                href={`/profile/${business.username}`}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors border-b border-border last:border-0 no-underline"
              >
                <img src={business.img} alt={business.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{business.name}</p>
                  <p className="text-[11px] text-muted-foreground">{business.category} · {business.distance}</p>
                </div>
                {business.rating !== undefined && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[11px] font-medium">{business.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                  </div>
                )}
              </Link>
            ))}
          </PanelCard>

          <PanelCard title="Comerciantes em destaque" icon={<Star className="w-4 h-4" />}>
            {featuredMerchants.map((merchant) => (
              <Link
                key={merchant.id}
                href={`/profile/${merchant.username}`}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors border-b border-border last:border-0 no-underline"
              >
                <img src={merchant.img} alt={merchant.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{merchant.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{merchant.bio}</p>
                </div>
              </Link>
            ))}
          </PanelCard>

          <PanelCard title="Categorias populares" icon={<ChevronRight className="w-4 h-4" />}>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {categories.slice(0, 6).map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    onClick={() => selectCategory(c.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      isCategoryActive(c.key)
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </PanelCard>

        </aside>
      </div>
      <BusinessReviewsDialog
        business={reviewBusiness}
        open={reviewBusinessId !== null}
        onOpenChange={(open) => {
          if (!open) setReviewBusinessId(null);
        }}
      />
    </div>
  );
}
