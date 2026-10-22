import { useParams, Link, Redirect } from "wouter";
import { ArrowLeft, BookOpenText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getPostMediaType } from "@/lib/postMedia";
import { useReadablePost } from "@/hooks/use-readable-post";
import { ArticleBody, readingMinutes } from "@/components/content/RichText";
import { ReferencePreviewCard } from "@/components/content/ReferencePreviewCard";
import { CommentThread } from "@/components/content/CommentThread";
import { UnavailableState } from "@/components/content/StateBlocks";
import { PostActionBar } from "@/components/post/PostActionBar";

export default function ArticleReader() {
  const params = useParams<{ postId: string }>();
  const result = useReadablePost(params.postId);

  const header = (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
      <button type="button" onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" aria-label="Voltar">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-primary"><BookOpenText className="h-4 w-4" /> Artigo</span>
    </div>
  );

  if (result.state !== "ok") {
    return (
      <div className="min-h-[100dvh]">
        {header}
        <UnavailableState
          title={result.state === "forbidden" ? "Sem permissão" : "Artigo indisponível"}
          description={result.state === "forbidden" ? "Este artigo é restrito ao Círculo ou privado." : "Ele pode ter sido removido ou o link está incorreto."}
          action={<Button asChild className="rounded-full"><Link href="/feed">Voltar ao feed</Link></Button>}
        />
      </div>
    );
  }

  const { post, author } = result;
  if (post.format !== "article" || !post.article) return <Redirect to={`/post/${post.id}`} replace />;
  const cover = post.mediaUrls?.findIndex((_, i) => getPostMediaType(post, i) === "image") ?? -1;

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      {header}
      <article className="mx-auto max-w-[680px] px-5 pt-8">
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight md:text-[2.4rem]">{post.article.title}</h1>
        <div className="mt-5 flex items-center gap-3 border-b border-border pb-5">
          <Link href={`/profile/${author.username}`}>
            <Avatar className="h-10 w-10"><AvatarImage src={author.avatarUrl} alt="" /><AvatarFallback>{author.displayName[0]}</AvatarFallback></Avatar>
          </Link>
          <div className="text-sm">
            <Link href={`/profile/${author.username}`} className="font-semibold hover:underline">{author.displayName}</Link>
            <p className="text-xs text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} · {readingMinutes(post.article.body)} min de leitura
            </p>
          </div>
        </div>

        {cover >= 0 && <img src={post.mediaUrls![cover]} alt="" className="mt-6 max-h-[420px] w-full rounded-2xl object-cover" />}

        <ArticleBody body={post.article.body} className="mt-7" />

        {post.mediaUrls && post.mediaUrls.length > (cover >= 0 ? 1 : 0) && (
          <div className="mt-6 grid grid-cols-2 gap-2">
            {post.mediaUrls.map((url, i) => i === cover ? null : getPostMediaType(post, i) === "video"
              ? <video key={url} src={url} controls playsInline className="w-full rounded-xl bg-black" aria-label={`Vídeo ${i + 1}`} />
              : <img key={url} src={url} alt={`Mídia ${i + 1}`} className="w-full rounded-xl object-cover" />)}
          </div>
        )}

        {post.reference && (
          <aside className="mt-8" aria-label="Conteúdo referenciado">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Este artigo comenta — a conversa original continua lá
            </p>
            <ReferencePreviewCard reference={post.reference} />
          </aside>
        )}

        <div className="mt-6 border-y border-border pb-2"><PostActionBar post={post} size="lg" /></div>
      </article>
      <div className="mx-auto max-w-[680px]"><CommentThread postId={post.id} /></div>
    </div>
  );
}
