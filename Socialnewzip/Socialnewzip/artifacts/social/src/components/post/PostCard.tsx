import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MoreHorizontal, Repeat2, BookOpenText, Trash2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type Post, formatTimeAgo } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { getPostMediaType } from "@/lib/postMedia";
import { postPath } from "@/lib/contentLinks";
import { RichText, articleExcerpt, readingMinutes } from "@/components/content/RichText";
import { canReadPost } from "@/services/contentValidation";
import { ReferencePreviewCard } from "@/components/content/ReferencePreviewCard";
import { PostActionBar } from "./PostActionBar";

interface PostCardProps {
  post: Post;
  compact?: boolean;
  /** When rendered from a repost distribution record: who reposted it. */
  repostedById?: string;
}

export function PostCard({ post, compact = false, repostedById }: PostCardProps) {
  const { getUserById, deletePost } = useSocial();
  const { currentUser } = useAppContext();
  const [, setLocation] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const author = getUserById(post.authorId);
  const reposter = repostedById ? getUserById(repostedById) : undefined;
  const viewerId = currentUser?.id ?? "me";

  if (!author || author.isBlocked || !canReadPost(post, currentUser?.id, author.isInCircle ?? false)) {
    return (
      <div className="border-b border-border px-4 py-4 text-sm text-muted-foreground" role="status">
        Publicação indisponível — a conta autora não está acessível.
      </div>
    );
  }

  const isMine = post.authorId === viewerId;
  const isArticle = post.format === "article" && !!post.article;
  const href = postPath(post);

  async function handleDelete() {
    setDeleteError("");
    try {
      await deletePost(post.id, viewerId);
      setConfirmDelete(false);
    } catch {
      setDeleteError("Não foi possível excluir. Tente novamente.");
    }
  }

  return (
    <article
      className="border-b border-border px-4 py-3 transition-colors hover:bg-muted/20"
      data-testid={`post-card-${post.id}`}
      aria-label={`Publicação de ${author.displayName}`}
    >
      {repostedById && (
        <div className="mb-1.5 ml-8 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Repeat2 className="h-3.5 w-3.5 text-green-500" aria-hidden />
          {reposter ? (
            <Link href={`/profile/${reposter.username}`} className="hover:underline">
              {repostedById === viewerId ? "Você repostou" : `Repostado por ${reposter.displayName}`}
            </Link>
          ) : "Repostado"}
        </div>
      )}
      <div className="flex gap-3">
        <Link href={`/profile/${author.username}`} className="shrink-0" aria-label={`Perfil de ${author.displayName}`}>
          <Avatar className="h-10 w-10 transition-opacity hover:opacity-90">
            <AvatarImage src={author.avatarUrl} alt="" />
            <AvatarFallback>{author.displayName[0]}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link href={`/profile/${author.username}`} className="text-sm font-bold leading-tight hover:underline">
                {author.displayName}
              </Link>
              {author.isVerified && (
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary" aria-label="Verificado">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </span>
              )}
              <span className="text-sm text-muted-foreground">@{author.username}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <time className="text-sm text-muted-foreground" dateTime={post.createdAt}>{formatTimeAgo(post.createdAt)}</time>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                aria-label="Mais opções"
                data-testid={`button-more-${post.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setLocation(href)}>Abrir publicação</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLocation(`/profile/${author.username}`)}>Ver perfil de {author.displayName}</DropdownMenuItem>
                {isMine && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir publicação
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isArticle ? (
            <Link
              href={href}
              className="mt-2 block overflow-hidden rounded-2xl border border-border bg-card/70 no-underline transition-colors hover:border-info/40"
              data-testid={`article-card-${post.id}`}
            >
              {post.mediaUrls?.[0] && getPostMediaType(post, 0) === "image" && (
                <img src={post.mediaUrls[0]} alt="" className="h-44 w-full object-cover" />
              )}
              <div className="p-4">
                <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-info">
                  <BookOpenText className="h-3 w-3" aria-hidden /> Artigo · {readingMinutes(post.article!.body)} min de leitura
                </span>
                <h3 className="text-lg font-bold leading-snug text-foreground">{post.article!.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{articleExcerpt(post.article!.body)}</p>
                <span className="mt-2 inline-block text-xs font-semibold text-info">Ler artigo</span>
              </div>
            </Link>
          ) : (
            <>
              {post.content && (
                <RichText
                  href={href}
                  className="text-sm leading-relaxed text-foreground"
                  text={compact && post.content.length > 200 ? post.content.slice(0, 200) + "…" : post.content}
                />
              )}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className={`mt-3 overflow-hidden rounded-2xl border border-border ${post.mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                  {post.mediaUrls.slice(0, 4).map((url, i) =>
                    getPostMediaType(post, i) === "video" ? (
                      <video key={url} src={url} controls playsInline className="max-h-80 w-full bg-black object-cover" aria-label={`Vídeo ${i + 1} de ${author.displayName}`} />
                    ) : (
                      <Link key={url} href={href}>
                        <img src={url} alt={`Mídia ${i + 1} de ${author.displayName}`} className="max-h-80 w-full object-cover" />
                      </Link>
                    ),
                  )}
                </div>
              )}
            </>
          )}

          {post.reference && (
            <div className="mt-3">
              <ReferencePreviewCard reference={post.reference} size="compact" />
            </div>
          )}

          {post.audience !== "public" && (
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              post.audience === "circles" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {post.audience === "circles" ? "Amigos" : "Privado"}
            </span>
          )}

          <PostActionBar post={post} />
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Comentários e reposts desta publicação deixarão de aparecer. Isto é diferente de desfazer um repost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); void handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
