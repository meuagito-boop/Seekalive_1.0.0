import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Heart, CornerDownRight, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { formatTimeAgo } from "@/data/mockData";
import type { SocialComment } from "@/types/content";
import { renderInline } from "./RichText";
import { ErrorState } from "./StateBlocks";

function CommentForm({
  postId,
  replyTo,
  onDone,
  autoFocus,
  placeholder,
}: {
  postId: string;
  replyTo?: string;
  onDone?: () => void;
  autoFocus?: boolean;
  placeholder: string;
}) {
  const { addComment } = useSocial();
  const { currentUser } = useAppContext();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const sending = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending.current) return;
    sending.current = true;
    setStatus("sending");
    try {
      await addComment(postId, content, currentUser?.id ?? "me", replyTo);
      setText("");
      setStatus("idle");
      onDone?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "O comentário não foi enviado. Seu texto foi mantido.");
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <label className="sr-only" htmlFor={`comment-${postId}-${replyTo ?? "root"}`}>{placeholder}</label>
        <input
          id={`comment-${postId}-${replyTo ?? "root"}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={2000}
          data-testid={replyTo ? `input-reply-${replyTo}` : "input-reply"}
          className="min-w-0 w-full flex-1 rounded-full border border-border bg-card/60 px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-info/60"
        />
        <button
          type="submit"
          disabled={!text.trim() || status === "sending"}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          data-testid={replyTo ? `button-send-reply-${replyTo}` : "button-post-reply"}
        >
          {status === "sending" && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          {replyTo ? "Responder" : "Comentar"}
        </button>
      </div>
      {status === "error" && <ErrorState message={errorMessage} />}
    </form>
  );
}

function CommentItem({
  comment,
  childrenByParent,
  depth,
}: {
  comment: SocialComment;
  childrenByParent: Map<string, SocialComment[]>;
  depth: number;
}) {
  const { getUserById, toggleCommentLike } = useSocial();
  const [replying, setReplying] = useState(false);
  const author = getUserById(comment.authorId);
  const replies = childrenByParent.get(comment.id) ?? [];

  return (
    <li className={depth > 0 ? "border-l border-border pl-4" : ""}>
      <div className="flex gap-3 py-3" data-testid={`comment-${comment.id}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={author?.avatarUrl} alt="" />
          <AvatarFallback>{author?.displayName?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
            {author ? (
              <Link href={`/profile/${author.username}`} className="font-semibold text-foreground hover:underline">{author.displayName}</Link>
            ) : (
              <span className="font-semibold text-muted-foreground">Conta indisponível</span>
            )}
            <span className="text-muted-foreground">· {formatTimeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{renderInline(comment.content)}</p>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => toggleCommentLike(comment.id)}
              aria-pressed={!!comment.isLiked}
              aria-label={comment.isLiked ? "Descurtir comentário" : "Curtir comentário"}
              className={`inline-flex items-center gap-1 hover:text-red-500 ${comment.isLiked ? "text-red-500" : ""}`}
            >
              <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? "fill-red-500" : ""}`} /> {Math.max(0, comment.likes)}
            </button>
            {depth < 3 && (
              <button type="button" onClick={() => setReplying((v) => !v)} className="inline-flex items-center gap-1 hover:text-info">
                <CornerDownRight className="h-3.5 w-3.5" /> Responder
              </button>
            )}
          </div>
          {replying && (
            <div className="mt-2">
              <CommentForm
                postId={comment.postId}
                replyTo={comment.id}
                autoFocus
                placeholder={`Responder ${author?.displayName ?? ""}`.trim()}
                onDone={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <ul className="ml-4">
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} childrenByParent={childrenByParent} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Comments belong to exactly one post id; replies point to a parent comment. */
export function CommentThread({ postId }: { postId: string }) {
  const { postComments } = useSocial();
  const { currentUser } = useAppContext();

  const { roots, childrenByParent } = useMemo(() => {
    const own = postComments.filter((c) => c.postId === postId);
    const ids = new Set(own.map((c) => c.id));
    const map = new Map<string, SocialComment[]>();
    const rootList: SocialComment[] = [];
    for (const c of own.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (c.replyToCommentId && ids.has(c.replyToCommentId)) {
        map.set(c.replyToCommentId, [...(map.get(c.replyToCommentId) ?? []), c]);
      } else {
        rootList.push(c);
      }
    }
    return { roots: rootList, childrenByParent: map };
  }, [postComments, postId]);

  return (
    <section aria-label="Comentários" className="px-4 pb-10">
      <div className="flex items-start gap-3 border-b border-border py-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={currentUser?.avatarUrl} alt="" />
          <AvatarFallback>{currentUser?.displayName?.[0] ?? "V"}</AvatarFallback>
        </Avatar>
        <CommentForm postId={postId} placeholder="Escreva um comentário" />
      </div>
      <h2 className="pt-4 text-sm font-semibold text-muted-foreground">
        {roots.length ? "Comentários" : "Ainda sem comentários"}
      </h2>
      {roots.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Seja a primeira pessoa a comentar nesta publicação.</p>
      ) : (
        <ul className="divide-y divide-border">
          {roots.map((c) => <CommentItem key={c.id} comment={c} childrenByParent={childrenByParent} depth={0} />)}
        </ul>
      )}
    </section>
  );
}
