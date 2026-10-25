import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Share2, ShoppingCart, Star, Store, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";
import { UnavailableState } from "@/components/content/StateBlocks";
import { useSavedShopItems } from "@/modules/shop/hooks/useSavedShopItems";
import type { ShopItem } from "@/modules/shop/types/item";

export default function ShopItemDetail() {
  const params = useParams<{ id: string }>();
  const { getUserById } = useSocial();
  const [shareOpen, setShareOpen] = useState(false);
  const { isSaved, toggle } = useSavedShopItems();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [itemLoading, setItemLoading] = useState(import.meta.env.DEV);
  const [fixtureError, setFixtureError] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    setItem(null);
    setItemLoading(true);
    setFixtureError(false);
    void import("@/data/demo/previewFixtures")
      .then(({ developmentShopItems }) => {
        if (active) setItem(developmentShopItems.find((product) => product.id === params.id) ?? null);
      })
      .catch(() => {
        if (active) setFixtureError(true);
      })
      .finally(() => {
        if (active) setItemLoading(false);
      });
    return () => { active = false; };
  }, [params.id]);

  if (itemLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">Carregando item...</div>;
  }

  if (!item) {
    return (
      <UnavailableState
        title="Item indisponível"
        description={fixtureError
          ? "Não foi possível carregar os dados de demonstração."
          : "Este item saiu do catálogo ou o link está incorreto."}
        action={<Button asChild className="rounded-full"><Link href="/shop">Voltar ao Shop</Link></Button>}
      />
    );
  }
  const seller = item.sellerId ? getUserById(item.sellerId) : undefined;
  if (seller?.isBlocked) {
    return <UnavailableState title="Item indisponível" description="O perfil responsável por este item está bloqueado para esta conta." />;
  }
  const saved = isSaved(item.id);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-5xl px-4 pb-24 pt-4">
      <Link href="/shop" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Shop
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <img src={item.img} alt={item.name} className="aspect-square w-full object-cover" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">Shop · {item.tag}</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{item.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Store className="h-4 w-4" />
            {seller ? <Link href={`/profile/${seller.username}`} className="font-semibold text-primary hover:underline">{seller.displayName}</Link> : item.store}
          </p>
          {item.rating !== undefined && (
            <p className="mt-3 flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {item.rating}
              {item.reviews !== undefined && <span className="text-muted-foreground">({item.reviews} avaliações)</span>}
            </p>
          )}
          {item.price && (
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{item.price}</span>
              {item.oldPrice && <span className="text-sm text-muted-foreground line-through">{item.oldPrice}</span>}
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Preço ilustrativo — não é uma oferta nem confirma disponibilidade.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button disabled className="rounded-full" title="Checkout ainda não disponível" data-testid="button-checkout-disabled">
              <ShoppingCart className="mr-2 h-4 w-4" /> Compra indisponível
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setShareOpen(true)} data-testid="button-share-item">
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => toggle(item.id)} aria-pressed={saved}>
              <Heart className={`mr-2 h-4 w-4 ${saved ? "fill-red-500 text-red-500" : ""}`} /> {saved ? "Salvo" : "Salvar"}
            </Button>
          </div>
          <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            Carrinho, pagamento e entrega ainda não existem no Seekalive. Nenhuma compra é registrada.
          </p>
        </div>
      </div>
      <ShareContentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        reference={{ type: "shop_item", id: item.id }}
        title={item.name}
        linkPath={`/shop/item/${item.id}`}
      />
    </div>
  );
}
