import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import {
  MapPin, Star, Calendar, Clock, X, Heart, Shuffle as ShuffleIcon,
  ChevronLeft, ChevronRight, Zap, Bookmark, Info, RotateCcw,
} from "lucide-react";

type CardKind = "event" | "commerce";

interface Card {
  id: string;
  kind: CardKind;
  name: string;
  img: string;
  category: string;
  location: string;
  description: string;
  rating?: number;
  reviews?: number;
  open?: boolean;
  date?: string;
  price?: string;
  interested?: number;
  tags?: string[];
}

const deck: Card[] = [
  {
    id: "e1", kind: "event",
    name: "Show de Jazz ao Vivo",
    img: "https://picsum.photos/seed/jazz11/600/800",
    category: "Música",
    location: "Bar do Zé · 1,1 km",
    description: "Uma noite incrível com os melhores músicos de jazz da cidade. Reservas limitadas.",
    date: "Sáb, 21 Jun · 21h",
    price: "R$ 30",
    interested: 142,
  },
  {
    id: "b1", kind: "commerce",
    name: "São Paulo Grill",
    img: "https://picsum.photos/seed/grill11/600/800",
    category: "Restaurante",
    location: "0,3 km · Pinheiros",
    description: "Cortes nobres assados na brasa com vista panorâmica. Um dos mais bem avaliados da região.",
    rating: 4.8,
    reviews: 342,
    open: true,
    tags: ["Carnes", "Almoço", "Jantar"],
  },
  {
    id: "e2", kind: "event",
    name: "Festival Gastronômico",
    img: "https://picsum.photos/seed/gastro22/600/800",
    category: "Gastronomia",
    location: "Praça Central · 0,6 km",
    description: "Mais de 40 restaurantes reunidos em um só lugar. Entrada gratuita, pague apenas o que consumir.",
    date: "Dom, 22 Jun · 11h",
    price: "Gratuito",
    interested: 380,
  },
  {
    id: "b2", kind: "commerce",
    name: "Barbearia Kings",
    img: "https://picsum.photos/seed/barber55/600/800",
    category: "Saúde e beleza",
    location: "1,2 km · Vila Madalena",
    description: "A barbearia premium da cidade. Corte, barba e experiência únicos. Agenda online disponível.",
    rating: 4.9,
    reviews: 256,
    open: true,
    tags: ["Corte", "Barba", "Premium"],
  },
  {
    id: "e3", kind: "event",
    name: "Feira de Artesanato",
    img: "https://picsum.photos/seed/fair33/600/800",
    category: "Cultura",
    location: "Parque Municipal · 0,9 km",
    description: "Produtos artesanais únicos de mais de 80 expositores locais. Entrada gratuita.",
    date: "Sáb, 21 Jun · 9h",
    price: "Gratuito",
    interested: 215,
  },
  {
    id: "b3", kind: "commerce",
    name: "Espaço Zen Spa",
    img: "https://picsum.photos/seed/spa33/600/800",
    category: "Bem-estar",
    location: "0,4 km · Jardins",
    description: "Massagens relaxantes, sauna e banho turco. O melhor retiro urbano da cidade.",
    rating: 4.9,
    reviews: 189,
    open: true,
    tags: ["Massagem", "Sauna", "Relax"],
  },
  {
    id: "e4", kind: "event",
    name: "Noite de Karaokê",
    img: "https://picsum.photos/seed/karaoke44/600/800",
    category: "Entretenimento",
    location: "Pub Irlanda · 0,7 km",
    description: "A noite mais divertida da semana! Microfone aberto e drinks especiais até meia-noite.",
    date: "Sex, 20 Jun · 20h",
    price: "R$ 15",
    interested: 89,
  },
  {
    id: "b4", kind: "commerce",
    name: "Café Central",
    img: "https://picsum.photos/seed/cafe33/600/800",
    category: "Café",
    location: "0,2 km · Centro",
    description: "O melhor café da cidade, com grãos selecionados e ambiente perfeito para trabalhar ou relaxar.",
    rating: 4.7,
    reviews: 521,
    open: false,
    tags: ["Café", "Brunch", "Coworking"],
  },
];

function SwipeCard({
  card,
  onSwipe,
  isTop,
  index,
}: {
  card: Card;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
  index: number;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-20, 0, 20]);
  const likeOpacity = useTransform(x, [30, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -30], [1, 0]);
  const cardScale = useTransform(x, [-220, 0, 220], [0.95, 1, 0.95]);
  const dragging = useRef(false);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    dragging.current = false;
    if (info.offset.x > 100) onSwipe("right");
    else if (info.offset.x < -100) onSwipe("left");
  }

  const stackOffset = Math.min(index, 2);

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        scale: isTop ? cardScale : 1 - stackOffset * 0.04,
        y: isTop ? 0 : stackOffset * 10,
        zIndex: 10 - index,
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        originY: 1,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={() => { dragging.current = true; }}
      onDragEnd={handleDragEnd}
      whileTap={isTop ? { cursor: "grabbing" } : {}}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl select-none bg-card border border-border">
        {/* Image */}
        <img
          src={card.img}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

        {/* Category pill — top left */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm border ${
            card.kind === "event"
              ? "bg-primary/80 text-white border-primary/50"
              : "bg-black/50 text-white border-white/20"
          }`}>
            {card.kind === "event" ? "🎉 Evento" : "🏪 Comércio"}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/50 text-white/90 backdrop-blur-sm border border-white/10">
            {card.category}
          </span>
        </div>

        {/* LIKE / NOPE indicators */}
        {isTop && (
          <>
            <motion.div
              className="absolute top-8 right-6 border-4 border-green-400 rounded-xl px-4 py-1 rotate-[-15deg]"
              style={{ opacity: likeOpacity }}
            >
              <span className="text-green-400 font-black text-2xl tracking-widest">LIKE</span>
            </motion.div>
            <motion.div
              className="absolute top-8 left-6 border-4 border-red-400 rounded-xl px-4 py-1 rotate-[15deg]"
              style={{ opacity: nopeOpacity }}
            >
              <span className="text-red-400 font-black text-2xl tracking-widest">NOPE</span>
            </motion.div>
          </>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Name */}
          <h2 className="text-2xl font-black text-white leading-tight mb-1">{card.name}</h2>

          {/* Location */}
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-white/60 shrink-0" />
            <span className="text-xs text-white/70">{card.location}</span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {card.kind === "commerce" && card.rating && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30">
                <Star className="w-3 h-3 fill-yellow-300" />
                {card.rating} · {card.reviews} avaliações
              </span>
            )}
            {card.kind === "commerce" && card.open !== undefined && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                card.open ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-zinc-700/60 text-zinc-400 border border-zinc-600/40"
              }`}>
                {card.open ? "Aberto agora" : "Fechado"}
              </span>
            )}
            {card.kind === "event" && card.date && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                <Calendar className="w-3 h-3" />
                {card.date}
              </span>
            )}
            {card.kind === "event" && card.price && (
              <span className="text-xs font-bold bg-white/10 text-white/80 px-2 py-0.5 rounded-full border border-white/15">
                {card.price}
              </span>
            )}
            {card.kind === "event" && card.interested && (
              <span className="text-xs text-white/60">{card.interested} interessados</span>
            )}
          </div>

          {/* Tags (commerce) */}
          {card.tags && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {card.tags.map(t => (
                <span key={t} className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <p className="text-xs text-white/70 leading-relaxed line-clamp-2">{card.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Shuffle() {
  const [cards, setCards] = useState(deck);
  const [liked, setLiked] = useState<Card[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [lastAction, setLastAction] = useState<"left" | "right" | null>(null);
  const [showMatch, setShowMatch] = useState<Card | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "event" | "commerce">("all");

  const filtered = cards.filter(c => activeFilter === "all" || c.kind === activeFilter);
  const visible = filtered.slice(0, 3);
  const done = filtered.length === 0;

  function handleSwipe(dir: "left" | "right") {
    const top = filtered[0];
    if (!top) return;
    setLastAction(dir);
    if (dir === "right") {
      setLiked(prev => [...prev, top]);
      if (top.kind === "event" || top.rating! >= 4.7) {
        setShowMatch(top);
        setTimeout(() => setShowMatch(null), 2000);
      }
    } else {
      setSkipped(s => s + 1);
    }
    setCards(prev => prev.filter(c => c.id !== top.id));
  }

  function reset() {
    setCards(deck);
    setLiked([]);
    setSkipped(0);
    setLastAction(null);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col bg-background">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <ShuffleIcon className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-black text-foreground tracking-tight">Shuffle</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Deslize para descobrir eventos e lugares</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Heart className="w-3.5 h-3.5 text-green-400" />
            <span className="font-semibold text-foreground">{liked.length}</span>
            <span>salvos</span>
          </div>
          <button
            onClick={reset}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="Reiniciar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mb-3">
        {([["all", "Tudo"], ["event", "🎉 Eventos"], ["commerce", "🏪 Comércios"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setActiveFilter(key); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeFilter === key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card stack */}
      <div className="flex-1 px-4 pb-2">
        <div className="relative w-full" style={{ height: "min(68vw + 120px, 500px)" }}>
          <AnimatePresence>
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border text-center px-8"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-black text-foreground mb-1">Acabaram os cards!</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Você curtiu {liked.length} e pulou {skipped}.
                </p>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" />
                  Jogar novamente
                </button>
              </motion.div>
            ) : (
              visible.map((card, i) => (
                <SwipeCard
                  key={card.id}
                  card={card}
                  isTop={i === 0}
                  index={i}
                  onSwipe={handleSwipe}
                />
              ))
            )}
          </AnimatePresence>

          {/* Match flash */}
          <AnimatePresence>
            {showMatch && (
              <motion.div
                key="match"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="bg-green-500 text-white rounded-2xl px-8 py-4 shadow-2xl flex items-center gap-3">
                  <Heart className="w-6 h-6 fill-white" />
                  <div>
                    <p className="font-black text-lg leading-tight">Curtido!</p>
                    <p className="text-xs text-green-100">{showMatch.name}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action buttons */}
      {!done && (
        <div className="flex items-center justify-center gap-6 px-4 pb-6">
          {/* Skip */}
          <button
            onClick={() => handleSwipe("left")}
            className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-lg hover:border-red-400 hover:text-red-400 active:scale-95 transition-all text-muted-foreground"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Info */}
          <button className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-md text-muted-foreground hover:text-foreground active:scale-95 transition-all">
            <Info className="w-4.5 h-4.5" />
          </button>

          {/* Like */}
          <button
            onClick={() => handleSwipe("right")}
            className="w-14 h-14 rounded-full bg-green-500 border-2 border-green-500 flex items-center justify-center shadow-lg hover:bg-green-400 active:scale-95 transition-all"
          >
            <Heart className="w-6 h-6 text-white fill-white" />
          </button>
        </div>
      )}

      {/* Liked cards row */}
      {liked.length > 0 && (
        <div className="px-4 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-foreground">Seus curtidos</p>
            <span className="text-xs text-muted-foreground">({liked.length})</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {liked.map(card => (
              <div key={card.id} className="flex-shrink-0 w-32 bg-card border border-border rounded-xl overflow-hidden">
                <div className="relative h-20">
                  <img src={card.img} alt={card.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    card.kind === "event" ? "bg-primary text-white" : "bg-black/60 text-white"
                  }`}>
                    {card.kind === "event" ? "Evento" : "Local"}
                  </span>
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[11px] font-semibold text-foreground truncate">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{card.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
