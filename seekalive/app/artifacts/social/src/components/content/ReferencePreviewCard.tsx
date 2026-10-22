import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpRight, MapPin, Star, X, Store, CalendarDays, FileText, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { resolveReference, referenceKey, referenceDataVersion } from "@/services/referenceResolver";
import type { ContentReference, ReferencePreview } from "@/types/content";
import { ErrorState } from "./StateBlocks";

const TYPE_META = {
  seek_entity: { label: "Seek", icon: Store, action: "Ver perfil" },
  shop_item: { label: "Shop", icon: ShoppingBag, action: "Ver produto" },
  social_post: { label: "Social", icon: FileText, action: "Abrir publicação" },
} as const;

/** Shared React Query hook — deduplicates by stable type+id and a coarse state version. */
export function useReferencePreview(reference: ContentReference | null | undefined) {
  const { users, posts, reviews } = useSocial();
  const { currentUser } = useAppContext();
  const viewerId = currentUser?.id;
  const snapshotUsers = useMemo(
    () => currentUser ? [...users.filter(user => user.id !== currentUser.id), currentUser] : users,
    [users, currentUser],
  );
  const target = reference ?? null;
  const version = referenceDataVersion({ users, posts, reviews }, currentUser);

  return useQuery<ReferencePreview | null>({
    queryKey: ["reference-preview", target ? referenceKey(target) : "none", viewerId ?? "anon", version],
    queryFn: () => resolveReference(target as ContentReference, { users: snapshotUsers, posts, reviews, viewerId }),
    enabled: !!target,
    staleTime: 60_000,
    retry: 1,
  });
}

function actionLabel(preview: ReferencePreview) {
  if (preview.type === "seek_entity" && /evento/i.test(preview.entityLabel ?? "")) return "Ver evento";
  return TYPE_META[preview.type].action;
}

export function ReferencePreviewCard({
  reference,
  onRemove,
  size = "default",
}: {
  reference: ContentReference;
  onRemove?: () => void;
  size?: "default" | "compact";
}) {
  const { data: preview, isLoading, isError, error, refetch, isFetching } = useReferencePreview(reference);
  const meta = TYPE_META[reference.type];
  const TypeIcon = preview?.type === "seek_entity" && /evento/i.test(preview.entityLabel ?? "") ? CalendarDays : meta.icon;

  const removeButton = onRemove && (
    <button
      type="button"
      onClick={onRemove}
      aria-label="Remover referência anexada"
      className="absolute right-2 top-2 z-10 rounded-full bg-background/85 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  if (isLoading) {
    return (
      <div className="relative flex gap-3 rounded-2xl border border-border bg-card/60 p-3" aria-busy="true" aria-label="Carregando prévia">
        <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        {removeButton}
      </div>
    );
  }

  if (isError) {
    const status = (error as { status?: number } | null)?.status;
    return (
      <div className="relative">
        <ErrorState
          message={status === 401 ? "Entre para ver esta prévia." : "Não foi possível carregar a prévia agora."}
          onRetry={isFetching ? undefined : () => void refetch()}
        />
        {removeButton}
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="relative rounded-2xl border border-dashed border-border bg-card/40 px-4 py-3.5" role="status">
        <p className="text-sm font-semibold">Conteúdo indisponível</p>
        <p className="text-xs text-muted-foreground">O item original foi removido ou não está acessível para você.</p>
        {removeButton}
      </div>
    );
  }

  const compact = size === "compact";

  return (
    <div className="relative">
      <Link
        href={preview.targetPath}
        onClick={(event) => event.stopPropagation()}
        aria-label={`${actionLabel(preview)}: ${preview.title}`}
        className="group flex gap-3 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-card p-3 no-underline transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        data-testid={`reference-${preview.type}-${preview.id}`}
      >
        {preview.imageUrl ? (
          <img
            src={preview.imageUrl}
            alt=""
            className={`${compact ? "h-14 w-14" : "h-20 w-20"} shrink-0 rounded-xl object-cover`}
          />
        ) : (
          <div className={`${compact ? "h-14 w-14" : "h-20 w-20"} flex shrink-0 items-center justify-center rounded-xl bg-muted`}>
            <TypeIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1 pr-6">
          <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <TypeIcon className="h-3 w-3" aria-hidden />
            {meta.label}
            {preview.entityLabel && <span className="text-muted-foreground">· {preview.entityLabel}</span>}
          </div>
          <p className="truncate text-sm font-semibold text-foreground">{preview.title}</p>
          {preview.type === "social_post" && preview.authorName && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {preview.authorAvatarUrl && <img src={preview.authorAvatarUrl} alt="" className="h-4 w-4 rounded-full" />}
              por {preview.authorName}
            </p>
          )}
          {preview.subtitle && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{preview.subtitle}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
            {preview.status && <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-foreground/80">{preview.status}</span>}
            {preview.distanceLabel && (
              <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" aria-hidden />{preview.distanceLabel}</span>
            )}
            {preview.rating !== undefined && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-hidden />
                {preview.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                {preview.ratingCount !== undefined && <span>({preview.ratingCount})</span>}
              </span>
            )}
            {preview.price && <span className="font-semibold text-primary">{preview.price}</span>}
            {preview.type === "shop_item" && preview.authorName && <span>Vendido por {preview.authorName}</span>}
          </div>
          <span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-primary group-hover:underline">
            {actionLabel(preview)} <ArrowUpRight className="h-3 w-3" aria-hidden />
          </span>
        </div>
      </Link>
      {removeButton}
    </div>
  );
}
