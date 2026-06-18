import { useState } from "react";
import { MapPin, Star, Clock, Calendar, Bookmark, Eye, ChevronRight, Utensils, Wine, Coffee, ShoppingBag, Briefcase, Heart, Smile, Filter } from "lucide-react";

const categories = [
  { label: "Restaurantes",    icon: Utensils,  key: "restaurantes" },
  { label: "Bares",           icon: Wine,      key: "bares" },
  { label: "Cafés",           icon: Coffee,    key: "cafes" },
  { label: "Eventos",         icon: Calendar,  key: "eventos" },
  { label: "Serviços",        icon: Briefcase, key: "servicos" },
  { label: "Compras",         icon: ShoppingBag, key: "compras" },
  { label: "Saúde e beleza",  icon: Heart,     key: "saude" },
  { label: "Lazer",           icon: Smile,     key: "lazer" },
  { label: "Próximos de mim", icon: MapPin,    key: "proximos" },
  { label: "Abertos agora",   icon: Clock,     key: "abertos" },
];

const mockBusinesses = [
  {
    id: "b1",
    name: "São Paulo Grill",
    category: "Restaurante",
    distance: "0,3 km",
    open: true,
    rating: 4.8,
    reviews: 342,
    img: "https://picsum.photos/seed/grill1/400/220",
    tags: ["Carnes", "Almoço", "Jantar"],
  },
  {
    id: "b2",
    name: "Bar do Zé",
    category: "Bar",
    distance: "0,5 km",
    open: true,
    rating: 4.5,
    reviews: 198,
    img: "https://picsum.photos/seed/barz2/400/220",
    tags: ["Drinks", "Petiscos", "Ao vivo"],
  },
  {
    id: "b3",
    name: "Café Central",
    category: "Café",
    distance: "0,2 km",
    open: false,
    rating: 4.7,
    reviews: 521,
    img: "https://picsum.photos/seed/cafe3/400/220",
    tags: ["Café", "Brunch", "Trabalho"],
  },
  {
    id: "b4",
    name: "Academia Power Fit",
    category: "Saúde e beleza",
    distance: "0,8 km",
    open: true,
    rating: 4.6,
    reviews: 87,
    img: "https://picsum.photos/seed/gym4/400/220",
    tags: ["Musculação", "Pilates", "CrossFit"],
  },
  {
    id: "b5",
    name: "Barbearia Kings",
    category: "Saúde e beleza",
    distance: "1,2 km",
    open: true,
    rating: 4.9,
    reviews: 256,
    img: "https://picsum.photos/seed/barber5/400/220",
    tags: ["Corte", "Barba", "Premium"],
  },
  {
    id: "b6",
    name: "Livraria Cultura",
    category: "Compras",
    distance: "1,5 km",
    open: true,
    rating: 4.4,
    reviews: 133,
    img: "https://picsum.photos/seed/book6/400/220",
    tags: ["Livros", "Papelaria", "Café"],
  },
];

const mockEvents = [
  {
    id: "e1",
    name: "Show de Jazz ao Vivo",
    date: "Sáb, 21 Jun · 21h",
    venue: "Bar do Zé",
    interested: 142,
    img: "https://picsum.photos/seed/jazz1/400/220",
    price: "R$ 30",
  },
  {
    id: "e2",
    name: "Festival Gastronômico",
    date: "Dom, 22 Jun · 11h",
    venue: "Praça Central",
    interested: 380,
    img: "https://picsum.photos/seed/gastro2/400/220",
    price: "Gratuito",
  },
  {
    id: "e3",
    name: "Feira de Artesanato",
    date: "Sáb, 21 Jun · 9h",
    venue: "Parque Municipal",
    interested: 215,
    img: "https://picsum.photos/seed/fair3/400/220",
    price: "Gratuito",
  },
  {
    id: "e4",
    name: "Noite de Karaokê",
    date: "Sex, 20 Jun · 20h",
    venue: "Pub Irlanda",
    interested: 89,
    img: "https://picsum.photos/seed/karaoke4/400/220",
    price: "R$ 15",
  },
];

const nearbyEvents = [
  { id: "e1", name: "Show de Jazz ao Vivo", date: "Sáb, 21 Jun", venue: "Bar do Zé", interested: 142 },
  { id: "e2", name: "Festival Gastronômico", date: "Dom, 22 Jun", venue: "Praça Central", interested: 380 },
  { id: "e3", name: "Feira de Artesanato", date: "Sáb, 21 Jun", venue: "Parque Municipal", interested: 215 },
];

const trendingPlaces = [
  { id: "b5", name: "Barbearia Kings",  category: "Saúde e beleza", distance: "1,2 km", rating: 4.9, img: "https://picsum.photos/seed/barber5/48/48" },
  { id: "b1", name: "São Paulo Grill",  category: "Restaurante",    distance: "0,3 km", rating: 4.8, img: "https://picsum.photos/seed/grill1/48/48" },
  { id: "b3", name: "Café Central",     category: "Café",           distance: "0,2 km", rating: 4.7, img: "https://picsum.photos/seed/cafe3/48/48" },
];

const featuredMerchants = [
  { id: "b2", name: "Bar do Zé",     highlight: "Promoção de drinks às 5ª",     img: "https://picsum.photos/seed/barz2/48/48" },
  { id: "b4", name: "Power Fit",     highlight: "1ª semana grátis para novos",  img: "https://picsum.photos/seed/gym4/48/48" },
];

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

function BusinessCard({ b }: { b: (typeof mockBusinesses)[0] }) {
  const [saved, setSaved] = useState(false);
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
          {b.open ? "Aberto agora" : "Fechado"}
        </span>
        <button
          onClick={() => setSaved((s) => !s)}
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
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-foreground">{b.rating}</span>
            <span className="text-[10px] text-muted-foreground ml-0.5">({b.reviews})</span>
          </div>
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
          <button className="flex-1 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            Ver detalhes
          </button>
          <button
            onClick={() => setSaved((s) => !s)}
            className="h-7 px-3 rounded-full border border-border text-xs text-muted-foreground font-semibold hover:border-primary/40 hover:text-foreground transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ e }: { e: (typeof mockEvents)[0] }) {
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
        <span className="absolute bottom-2 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white">
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
          <button className="flex-1 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
            Ver evento
          </button>
          <button
            onClick={() => setSaved((s) => !s)}
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"comercios" | "eventos">("comercios");

  return (
    <div className="min-h-screen">
      {/* Mobile categories + tab */}
      <div className="md:hidden">
        <div className="flex gap-2 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <CategoryChip
              key={c.key}
              icon={c.icon}
              label={c.label}
              active={activeCategory === c.key}
              onClick={() => setActiveCategory(activeCategory === c.key ? null : c.key)}
            />
          ))}
        </div>
        <div className="flex border-b border-border px-3">
          <button
            onClick={() => setActiveTab("comercios")}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "comercios" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            Comércios
          </button>
          <button
            onClick={() => setActiveTab("eventos")}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "eventos" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            Eventos
          </button>
        </div>
        <div className="p-3 grid grid-cols-1 gap-3">
          {activeTab === "comercios"
            ? mockBusinesses.map((b) => <BusinessCard key={b.id} b={b} />)
            : mockEvents.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
      </div>

      {/* Desktop 3-column layout */}
      <div className="hidden md:flex max-w-6xl mx-auto px-4 pt-4 gap-4 items-start">

        {/* Left: categories */}
        <aside className="w-52 flex-shrink-0 sticky top-[108px] self-start">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Categorias</p>
            </div>
            <nav className="py-1">
              {categories.map((c) => {
                const Icon = c.icon;
                const active = activeCategory === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setActiveCategory(active ? null : c.key)}
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
          {/* Tab selector */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveTab("comercios")}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "comercios"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Comércios
              </button>
              <button
                onClick={() => setActiveTab("eventos")}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "eventos"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Eventos
              </button>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {activeTab === "comercios" && (
            <div className="grid grid-cols-2 gap-4">
              {mockBusinesses.map((b) => (
                <BusinessCard key={b.id} b={b} />
              ))}
            </div>
          )}
          {activeTab === "eventos" && (
            <div className="grid grid-cols-2 gap-4">
              {mockEvents.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          )}
        </main>

        {/* Right: context panel */}
        <aside className="w-72 flex-shrink-0 sticky top-[108px] self-start max-h-[calc(100vh-112px)] overflow-y-auto">

          <PanelCard title="Eventos próximos" icon={<Calendar className="w-4 h-4" />}>
            {nearbyEvents.map((ev) => (
              <div key={ev.id} className="px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0">
                <p className="text-xs font-semibold text-foreground">{ev.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ev.date} · {ev.venue}</p>
                <p className="text-[11px] text-primary mt-0.5">{ev.interested} interessados</p>
              </div>
            ))}
          </PanelCard>

          <PanelCard title="Lugares em alta" icon={<MapPin className="w-4 h-4" />}>
            {trendingPlaces.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0">
                <img src={p.img} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.category} · {p.distance}</p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-[11px] font-medium">{p.rating}</span>
                </div>
              </div>
            ))}
          </PanelCard>

          <PanelCard title="Comerciantes em destaque" icon={<Star className="w-4 h-4" />}>
            {featuredMerchants.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0">
                <img src={m.img} alt={m.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.highlight}</p>
                </div>
              </div>
            ))}
          </PanelCard>

          <PanelCard title="Categorias populares" icon={<ChevronRight className="w-4 h-4" />}>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {categories.slice(0, 6).map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    onClick={() => setActiveCategory(activeCategory === c.key ? null : c.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      activeCategory === c.key
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
    </div>
  );
}
