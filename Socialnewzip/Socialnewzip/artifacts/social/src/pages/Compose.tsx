import { useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Users, Lock, Loader2, BookOpenText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { useDraftMedia, MAX_MEDIA_ITEMS } from "@/hooks/use-draft-media";
import { MediaDraftGrid, MediaPickerButtons } from "@/components/content/MediaDraftGrid";
import { ReferencePreviewCard } from "@/components/content/ReferencePreviewCard";
import { ErrorState } from "@/components/content/StateBlocks";
import { renderInline } from "@/components/content/RichText";
import { articleCreatePath, extractHashtags, extractMentions, readReferenceFromSearch, postPath } from "@/lib/contentLinks";
import type { ContentReference } from "@/types/content";

const MAX_CHARS = 280;

const audiences = [
  { value: "public" as const, label: "Público", icon: Globe, desc: "Qualquer pessoa pode ver" },
  { value: "circles" as const, label: "Amigos", icon: Users, desc: "Apenas seus amigos" },
  { value: "private" as const, label: "Privado", icon: Lock, desc: "Somente você" },
];

export default function Compose() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { currentUser } = useAppContext();
  const { publishPost } = useSocial();
  const initialReference = useMemo(() => readReferenceFromSearch(search), [search]);

  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"public" | "circles" | "private">("public");
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const [reference, setReference] = useState<ContentReference | null>(initialReference);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const submitting = useRef(false);
  const draft = useDraftMedia();

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const hasBody = content.trim().length > 0 || draft.media.length > 0;
  const canPost = hasBody && !isOverLimit && !draft.preparing && status !== "submitting" && !!currentUser;
  const selectedAudience = audiences.find((a) => a.value === audience)!;
  const AudienceIcon = selectedAudience.icon;
  const progressPct = Math.min(content.length / MAX_CHARS, 1);
  const circumference = 2 * Math.PI * 12;
  const tags = extractHashtags(content);
  const mentions = extractMentions(content);
  const busy = status === "submitting";
  function leave() {
    if (busy) return;
    if (content.trim() || draft.media.length) setConfirmCancel(true);
    else setLocation("/feed");
  }

  async function handlePost() {
    if (!canPost || submitting.current || !currentUser) return;
    submitting.current = true;
    setStatus("submitting");
    setSubmitError("");
    try {
      const post = await publishPost({
        authorId: currentUser.id,
        content: content.trim(),
        audience,
        format: draft.media.length ? "media" : "text",
        mediaUrls: draft.media.map((m) => m.url),
        mediaTypes: draft.media.map((m) => m.type),
        reference: reference ?? undefined,
      });
      draft.handOff();
      setLocation(postPath(post));
    } catch (error) {
      setStatus("error");
      setSubmitError(error instanceof Error ? error.message : "Não foi possível publicar. Seu rascunho foi mantido.");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg">
        <button
          type="button"
          onClick={leave}
          disabled={busy}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted/50"
          aria-label="Cancelar"
          data-testid="button-cancel"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              if ((content.trim() || draft.media.length) && !window.confirm("Descartar esta publicação para escrever um artigo?")) return;
              setLocation(articleCreatePath(reference ?? undefined));
            }}
            disabled={busy || draft.preparing}
            className="min-h-11 gap-1.5 rounded-full px-3 text-sm text-primary hover:bg-primary/10 hover:text-primary"
          >
            <BookOpenText className="h-4 w-4" /> Escrever artigo
          </Button>
          <Button
            onClick={handlePost}
            disabled={!canPost}
            className="min-h-11 rounded-full px-5 text-sm font-semibold"
            data-testid="button-post"
            aria-busy={status === "submitting"}
          >
            {status === "submitting" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {busy ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={currentUser?.avatarUrl} alt="" />
            <AvatarFallback>{currentUser?.displayName?.[0] ?? "V"}</AvatarFallback>
          </Avatar>

          <div className="relative flex-1">
            <p className="mb-2 break-words font-semibold">{currentUser?.displayName}</p>
            <h1 className="sr-only">Criar publicação</h1>
            <button
              type="button"
              onClick={() => setShowAudiencePicker((v) => !v)}
              disabled={busy}
              data-testid="button-audience"
              aria-expanded={showAudiencePicker}
              className="mb-3 flex items-center gap-1.5 rounded-full border border-primary/60 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <AudienceIcon className="h-3 w-3" />
              {selectedAudience.label}
            </button>

            <AnimatePresence>
              {showAudiencePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  className="absolute left-0 top-10 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                >
                  {audiences.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        type="button"
                        key={a.value}
                        onClick={() => { setAudience(a.value); setShowAudiencePicker(false); }}
                        data-testid={`audience-option-${a.value}`}
                        className={`flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${audience === a.value ? "text-primary" : "text-foreground"}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-semibold">{a.label}</p>
                          <p className="text-xs text-muted-foreground">{a.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <label htmlFor="compose-text" className="sr-only">Texto da publicação</label>
            <textarea
              id="compose-text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={reference ? "Escreva sobre este conteúdo. Use @menções e #hashtags." : "Escreva sua publicação…"}
              disabled={busy}
              data-testid="input-compose"
              rows={6}
              autoFocus
              className="w-full resize-none border-none bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground"
            />

            {(tags.length > 0 || mentions.length > 0) && (
              <p className="mb-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground" aria-live="polite">
                {renderInline([...mentions.map((m) => `@${m}`), ...tags.map((t) => `#${t}`)].join(" "))}
              </p>
            )}

            <MediaDraftGrid media={draft.media} onRemove={(url) => { if (!busy) draft.remove(url); }} />
            {draft.preparing && <p role="status" className="mt-2 text-sm text-muted-foreground">Preparando prévia da mídia…</p>}
            {draft.error && <p role="alert" className="mt-2 text-sm text-destructive">{draft.error}</p>}

            {reference && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Conteúdo anexado — continua do autor original</p>
                <ReferencePreviewCard reference={reference} onRemove={() => setReference(null)} />
              </div>
            )}

            {status === "error" && <div className="mt-3"><ErrorState message={submitError} onRetry={handlePost} /></div>}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <MediaPickerButtons count={draft.media.length} disabled={busy || draft.preparing} onAdd={(f, t) => void draft.add(f, t)} />
          <div className="relative h-8 w-8" aria-label={`${remaining} caracteres restantes`}>
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32" aria-hidden>
              <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-border" />
              <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5" fill="none"
                strokeDasharray={`${progressPct * circumference} ${circumference}`} strokeLinecap="round"
                className={isOverLimit ? "text-destructive" : remaining < 20 ? "text-yellow-500" : "text-primary"} />
            </svg>
            {remaining < 20 && (
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {remaining}
              </span>
            )}
          </div>
        </div>
        <div className="mx-auto mt-2 flex max-w-2xl flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{content.length}/{MAX_CHARS} caracteres · {draft.media.length}/{MAX_MEDIA_ITEMS} mídias · fotos até 10 MB · vídeos até 100 MB</span>
        </div>
      </div>
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar publicação?</AlertDialogTitle>
            <AlertDialogDescription>O texto e as mídias selecionadas serão descartados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar escrevendo</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation("/feed")}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
