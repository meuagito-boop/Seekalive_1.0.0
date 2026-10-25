import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Star, Heart, Tag, Store, ChevronRight, Package, Zap, Eye } from "lucide-react";
import type { ShopItem, ShopStore } from "@/modules/shop/types/item";
import { useSavedShopItems } from "@/modules/shop/hooks/useSavedShopItems";

const shopCategories = [
  { label: "Todos",        key: "all" },
  { label: "Produtos",     key: "produtos" },
  { label: "Serviços",     key: "servicos" },
  { label: "Ofertas",      key: "ofertas" },
  { label: "Lojas",        key: "lojas" },
];


function ProductCard({ p, liked, onToggle }: { p: ShopItem; liked: boolean; onToggle: () => void }) {
  const hasDiscount = !!p.oldPrice;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group">
      <div className="relative aspect-square overflow-hidden">
        <Link href={`/shop/item/${p.id}`} aria-label={`Ver ${p.name}`}>
          <img
            src={p.img}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Tag className="w-2.5 h-2.5" /> Oferta
          </span>
        )}
        <button
          onClick={onToggle}
          aria-label={liked ? `Remover ${p.name} dos salvos` : `Salvar ${p.name}`}
          aria-pressed={liked}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-muted-foreground mb-0.5">{p.store}</p>
        <Link href={`/shop/item/${p.id}`} className="block font-semibold text-sm text-foreground leading-tight mb-1 line-clamp-2 hover:underline">{p.name}</Link>
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
        <Link href={`/shop/item/${p.id}`} className="w-full h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 no-underline">
          <Eye className="w-3.5 h-3.5" />
          Ver produto
        </Link>
      </div>
    </div>
  );
}

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [shopData, setShopData] = useState<{ items: ShopItem[]; stores: ShopStore[] }>({ items: [], stores: [] });
  const [demoLoading, setDemoLoading] = useState(import.meta.env.DEV);
  const [demoError, setDemoError] = useState(false);
  const { isSaved, toggle } = useSavedShopItems();
  const mockProducts = import.meta.env.DEV ? shopData.items : [];
  const featuredStores = import.meta.env.DEV ? shopData.stores : [];
  const discountedProducts = mockProducts.filter((p) => p.oldPrice).slice(0, 4);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    void import("@/modules/app/data/demo/previewFixtures")
      .then(({ developmentShopItems, developmentShopStores }) => {
        if (active) setShopData({ items: developmentShopItems, stores: developmentShopStores });
      })
      .catch(() => {
        if (active) setDemoError(true);
      })
      .finally(() => {
        if (active) setDemoLoading(false);
      });
    return () => { active = false; };
  }, []);

  const emptyCatalogMessage = demoLoading
    ? "Carregando catálogo de demonstração..."
    : demoError
      ? "Não foi possível carregar o catálogo de demonstração."
      : "O catálogo será exibido quando houver produtos reais disponíveis.";
  const filtered = activeCategory === "all"
    ? mockProducts
    : mockProducts.filter((p) => p.tag === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Banner */}
      {mockProducts.length > 0 && <div className="hidden md:block bg-gradient-to-r from-orange-500/20 via-primary/10 to-transparent border-b border-border px-6 py-4 max-w-6xl mx-auto mt-4 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">Ofertas da semana</p>
            <p className="text-sm text-muted-foreground">Preços ilustrativos · compra ainda indisponível</p>
          </div>
        </div>
      </div>}

      <div className="hidden md:flex max-w-6xl mx-auto px-4 gap-4 items-start">

        {/* Left: categories + stores */}
        <aside className="w-52 flex-shrink-0 sticky top-[108px] self-start space-y-4">
          {featuredStores.length > 0 && <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Categorias</p>
            </div>
            <nav className="py-1">
              {shopCategories.map((c) => {
                const active = activeCategory === c.key;
                return (
                  <button
                    key={c.key}
                    disabled={c.key === "lojas"}
                    title={c.key === "lojas" ? "Perfis das lojas ainda não estão disponíveis." : undefined}
                    onClick={() => setActiveCategory(c.key)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                      active
                        ? "text-primary font-semibold bg-primary/8"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {c.label}{c.key === "lojas" ? " · Em breve" : ""}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </nav>
          </div>}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Store className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground flex-1">Lojas em destaque</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            {featuredStores.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border last:border-0"
              >
                <img src={s.img} alt={s.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.category} · {s.followers} seguidores</p>
                  <p className="text-[11px] text-muted-foreground">Perfil da loja indisponível</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: products */}
        <main className="flex-1 min-w-0 pb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
            <button disabled title="Ordenação ainda não disponível" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground opacity-50 cursor-not-allowed">
              <Package className="w-4 h-4" />
              Ordenar
            </button>
          </div>
          {filtered.length > 0
            ? <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} p={p} liked={isSaved(p.id)} onToggle={() => toggle(p.id)} />
                ))}
              </div>
            : <p role={demoError ? "alert" : undefined} aria-live="polite" className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{emptyCatalogMessage}</p>}
        </main>

        {/* Right: featured stores panel */}
        <aside className="w-64 flex-shrink-0 sticky top-[108px] self-start">
          {discountedProducts.length > 0 && <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Ofertas relâmpago</p>
            </div>
            {discountedProducts.map((p) => (
              <Link key={p.id} href={`/shop/item/${p.id}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors border-b border-border last:border-0 no-underline">
                <img src={p.img} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-primary font-medium">{p.price}</p>
                  {p.oldPrice && <p className="text-[10px] text-muted-foreground line-through">{p.oldPrice}</p>}
                </div>
              </Link>
            ))}
          </div>}
        </aside>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        {/* Mobile categories */}
        <div className="flex gap-2 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {shopCategories.map((c) => (
            <button
              key={c.key}
              disabled={c.key === "lojas"}
              title={c.key === "lojas" ? "Perfis das lojas ainda não estão disponíveis." : undefined}
              onClick={() => setActiveCategory(c.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                activeCategory === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {c.label}{c.key === "lojas" ? " · Em breve" : ""}
            </button>
          ))}
        </div>

        {/* Mobile offer banner */}
        {mockProducts.length > 0 && <div className="mx-3 mb-3 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-xs text-foreground font-medium">Compra ainda indisponível</p>
        </div>}

        <div className="px-3 pb-6 grid grid-cols-2 gap-3">
          {filtered.length > 0
            ? filtered.map((p) => (
                <ProductCard key={p.id} p={p} liked={isSaved(p.id)} onToggle={() => toggle(p.id)} />
              ))
            : <p role={demoError ? "alert" : undefined} aria-live="polite" className="col-span-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{emptyCatalogMessage}</p>}
        </div>
      </div>
    </div>
  );
}
