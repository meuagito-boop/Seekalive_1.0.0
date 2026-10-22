import { useParams, useLocation, Link, Redirect } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/data/mockData";
import { getPostMediaType } from "@/lib/postMedia";
import { useReadablePost } from "@/hooks/use-readable-post";
import { RichText } from "@/components/content/RichText";
import { ReferencePreviewCard } from "@/components/content/ReferencePreviewCard";
import { CommentThread } from "@/components/content/CommentThread";
import { UnavailableState } from "@/components/content/StateBlocks";
import { PostActionBar } from "@/components/post/PostActionBar";

export default function PostDetail() {
  const params = useParams<{ postId: string }>();
  const [, setLocation] = useLocation();
  const result = useReadablePost(params.postId);

  const header = (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
      <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/feed")}
        className="text-muted-foreground hover:text-foreground" aria-label="Voltar" data-testid="button-back">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-bold">Publicação</h1>
    </div>
  );

  if (result.state !== "ok") {
    return (
      <div className="min-h-[100dvh] pb-16 md:pb-0">
        {header}
        <UnavailableState
          title={result.state === "forbidden" ? "Sem permissão" : "Publicação indisponível"}
          description={result.state === "forbidden"
            ? "Esta publicação é restrita a amigos ou privada."
            : "Ela pode ter sido removida ou o link está incorreto."}
          action={<Button asChild className="rounded-full"><Link href="/feed">Voltar ao feed</Link></Button>}
        />
      </div>
    );
  }

  const { post, author } = result;
  if (post.format === "article") return <Redirect to={`/article/${post.id}`} replace />;

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      {header}
      <article className="border-b border-border px-4 pb-2 pt-4">
        <div className="mb-3 flex items-start gap-3">
          <Link href={`/profile/${author.username}`}>
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={author.avatarUrl} alt="" />
              <AvatarFallback>{author.displayName[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link href={`/profile/${author.username}`} className="text-base font-bold hover:underline">{author.displayName}</Link>
            <p className="text-sm text-muted-foreground">@{author.username}</p>
          </div>
        </div>

        {post.content && <RichText text={post.content} className="mb-3 text-lg leading-relaxed" />}

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={`mb-3 overflow-hidden rounded-2xl border border-border ${post.mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
            {post.mediaUrls.map((url, index) =>
              getPostMediaType(post, index) === "video" ? (
                <video key={url} src={url} controls playsInline className="max-h-96 w-full bg-black object-cover" aria-label={`Vídeo ${index + 1}`} />
              ) : (
                <img key={url} src={url} alt={`Mídia ${index + 1} de ${author.displayName}`} className="h-auto max-h-96 w-full object-cover" />
              ),
            )}
          </div>
        )}

        {post.reference && <div className="mb-3"><ReferencePreviewCard reference={post.reference} /></div>}

        <p className="mb-3 text-sm text-muted-foreground">
          {new Date(post.createdAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", year: "numeric" })}
        </p>

        <div className="flex gap-6 border-y border-border py-3 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{formatCount(Math.max(0, post.reposts))}</strong> Reposts</span>
          <span><strong className="text-foreground">{formatCount(Math.max(0, post.comments))}</strong> Comentários</span>
          <span><strong className="text-foreground">{formatCount(Math.max(0, post.likes))}</strong> Curtidas</span>
        </div>
        <PostActionBar post={post} size="lg" />
      </article>
      <CommentThread postId={post.id} />
    </div>
  );
}
