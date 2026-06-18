import { useState } from "react";
import { Star, ShoppingCart, Heart, Tag, Store, ChevronRight, Package, Zap } from "lucide-react";

const shopCategories = [
  { label: "Todos",        key: "all" },
  { label: "Produtos",     key: "produtos" },
  { label: "Serviços",     key: "servicos" },
  { label: "Ofertas",      key: "ofertas" },
  { label: "Lojas",        key: "lojas" },
];

const mockProducts = [
  { id: "p1", name: "Tênis Runner Pro",         store: "SportZone",       price: "R$ 299,90", oldPrice: "R$ 399,90", rating: 4.8, reviews: 312, tag: "ofertas",  img: "https://picsum.photos/seed/shoe1/300/300" },
  { id: "p2", name: "Fone Bluetooth Ultra",      store: "TechMania",       price: "R$ 189,00", oldPrice: null,        rating: 4.6, reviews: 145, tag: "produtos", img: "https://picsum.photos/seed/fone2/300/300" },
  { id: "p3", name: "Mochila Urbana 30L",        store: "Mundo Bags",      price: "R$ 149,90", oldPrice: "R$ 220,00", rating: 4.7, reviews: 98,  tag: "ofertas",  img: "https://picsum.photos/seed/bag3/300/300" },
  { id: "p4", name: "Plano Nutrição Premium",    store: "Vida Saudável",   price: "R$ 79,90/mês", oldPrice: null,    rating: 4.9, reviews: 214, tag: "servicos", img: "https://picsum.photos/seed/nut4/300/300" },
  { id: "p5", name: "Cafeteira Italiana",        store: "Casa & Gosto",    price: "R$ 129,00", oldPrice: "R$ 180,00", rating: 4.5, reviews: 67,  tag: "ofertas",  img: "https://picsum.photos/seed/cafe5/300/300" },
  { id: "p6", name: "Corte + Barba Express",     store: "Barbearia Kings", price: "R$ 65,00",  oldPrice: null,        rating: 4.9, reviews: 530, tag: "servicos", img: "https://picsum.photos/seed/barb6/300/300" },
  { id: "p7", name: "Smartwatch Fit X4",         store: "TechMania",       price: "R$ 349,00", oldPrice: "R$ 499,00", rating: 4.7, reviews: 402, tag: "ofertas",  img: "https://picsum.photos/seed/watch7/300/300" },
  { id: "p8", name: "Livro: Hábitos Atômicos",   store: "Livraria Cultura", price: "R$ 49,90", oldPrice: null,       rating: 4.9, reviews: 1204,tag: "produtos", img: "https://picsum.photos/seed/book8/300/300" },
];

const featuredStores = [
  { id: "s1", name: "TechMania",       category: "Eletrônicos",  img: "https://picsum.photos/seed/store1/48/48", followers: "12k" },
  { id: "s2", name: "SportZone",       category: "Esportes",     img: "https://picsum.photos/seed/store2/48/48", followers: "8,4k" },
  { id: "s3", name: "Casa & Gosto",    category: "Casa",         img: "https://picsum.photos/seed/store3/48/48", followers: "5,1k" },
  { id: "s4", name: "Vida Saudável",   category: "Saúde",        img: "https://picsum.photos/seed/store4/48/48", followers: "9,7k" },
];

function ProductCard({ p }: { p: (typeof mockProducts)[0] }) {
  const [liked, setLiked] = useState(false);
  const hasDiscount = !!p.oldPrice;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={p.img}
          alt={p.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Tag className="w-2.5 h-2.5" /> Oferta
          </span>
        )}
        <button
          onClick={() => setLiked((l) => !l)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-muted-foreground mb-0.5">{p.store}</p>
        <p className="font-semibold text-sm text-foreground leading-tight mb-1 line-clamp-2">{p.name}</p>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-medium text-foreground">{p.rating}</span>
          <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="font-bold text-primary text-base">{p.price}</span>
          {p.oldPrice && (
            <span className="text-xs text-muted-foreground line-through">{p.oldPrice}</span>
          )}
        </div>
        <button className="w-full h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" />
          Adicionar
        </button>
      </div>
    </div>
  );
}

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = activeCategory === "all"
    ? mockProducts
    : mockProducts.filter((p) => p.tag === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="hidden md:block bg-gradient-to-r from-orange-500/20 via-primary/10 to-transparent border-b border-border px-6 py-4 max-w-6xl mx-auto mt-4 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">Ofertas da semana</p>
            <p className="text-sm text-muted-foreground">Descontos de até 40% em produtos selecionados</p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex max-w-6xl mx-auto px-4 gap-4 items-start">

        {/* Left: categories + stores */}
        <aside className="w-52 flex-shrink-0 sticky top-[108px] self-start space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Categorias</p>
            </div>
            <nav className="py-1">
              {shopCategories.map((c) => {
                const active = activeCategory === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setActiveCategory(c.key)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                      active
                        ? "text-primary font-semibold bg-primary/8"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {c.label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Store className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground flex-1">Lojas em destaque</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            {featuredStores.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0"
              >
                <img src={s.img} alt={s.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.category} · {s.followers} seguidores</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: products */}
        <main className="flex-1 min-w-0 pb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Package className="w-4 h-4" />
              Ordenar
            </button>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </main>

        {/* Right: featured stores panel */}
        <aside className="w-64 flex-shrink-0 sticky top-[108px] self-start">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Ofertas relâmpago</p>
            </div>
            {mockProducts.filter((p) => p.oldPrice).slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0">
                <img src={p.img} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-primary font-medium">{p.price}</p>
                  {p.oldPrice && <p className="text-[10px] text-muted-foreground line-through">{p.oldPrice}</p>}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        {/* Mobile categories */}
        <div className="flex gap-2 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {shopCategories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                activeCategory === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Mobile offer banner */}
        <div className="mx-3 mb-3 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-xs text-foreground font-medium">Ofertas da semana — até 40% de desconto</p>
        </div>

        <div className="px-3 pb-6 grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
