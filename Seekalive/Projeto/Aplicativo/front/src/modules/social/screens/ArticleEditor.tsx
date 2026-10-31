import { useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { X, Loader2, Bold, Italic, Heading2, List, Quote, Eye, PenLine, Globe, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useDraftMedia } from "@/hooks/use-draft-media";
import { MediaDraftGrid, MediaPickerButtons } from "@/components/content/MediaDraftGrid";
import { ReferencePreviewCard } from "@/components/content/ReferencePreviewCard";
import { ArticleBody, readingMinutes } from "@/components/content/RichText";
import { ErrorState } from "@/components/content/StateBlocks";
import { readReferenceFromSearch } from "@/lib/contentLinks";
import type { ContentReference } from "@/modules/app/content/contentReferences";
import { handleTabKeyDown } from "@/lib/tabKeyboard";

const TITLE_MAX = 160;

const audiences = [
  { value: "public" as const, label: "Público", icon: Globe },
  { value: "circles" as const, label: "Círculo", icon: Users },
  { value: "private" as const, label: "Privado", icon: Lock },
];

export default function ArticleEditor() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { currentUser } = useAppContext();
  const { publishPost, isRemoteSocialSession } = useSocial();
  const initialReference = useMemo(() => readReferenceFromSearch(search), [search]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"public" | "circles" | "private">("public");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [reference, setReference] = useState<ContentReference | null>(initialReference);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const submitting = useRef(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const draft = useDraftMedia();

  const titleError = !title.trim() ? "Dê um título ao artigo." : title.length > TITLE_MAX ? `Use até ${TITLE_MAX} caracteres.` : "";
  const bodyError = !body.trim() ? "Escreva o corpo do artigo." : body.length > 50000 ? "Use até 50 mil caracteres." : "";
  const valid = !titleError && !bodyError;

  function wrap(prefix: string, suffix = prefix, linePrefix = false) {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = body.slice(s, e) || (linePrefix ? "" : "texto");
    const next = linePrefix
      ? body.slice(0, s) + (s > 0 && body[s - 1] !== "\n" ? "\n\n" : "") + prefix + selected + body.slice(e)
      : body.slice(0, s) + prefix + selected + suffix + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => el.focus());
  }

  async function submit() {
    setTouched(true);
    if (!valid || submitting.current || draft.preparing || !currentUser) return;
    submitting.current = true;
    setStatus("submitting");
    setSubmitError("");
    try {
      const post = await publishPost({
        authorId: currentUser.id,
        content: title.trim(),
        audience,
        format: "article",
        article: { title: title.trim(), body: body.trim() },
        mediaUrls: draft.media.map((m) => m.url),
        mediaTypes: draft.media.map((m) => m.type),
        mediaFiles: draft.media.map((m) => m.file),
        reference: reference ?? undefined,
      });
      if (!isRemoteSocialSession) draft.handOff();
      setLocation(`/article/${post.id}`);
    } catch (error) {
      setStatus("error");
      setSubmitError(error instanceof Error ? error.message : "Não foi possível publicar. Seu texto foi mantido.");
    } finally {
      submitting.current = false;
    }
  }

  const tool = "rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.history.back()} aria-label="Cancelar" className="rounded-full p-2 text-muted-foreground hover:bg-muted/50">
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">Novo artigo</span>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Modo do editor" className="flex rounded-full border border-border p-0.5 text-xs">
            {(["write", "preview"] as const).map((m) => (
              <button key={m} id={`article-mode-tab-${m}`} aria-controls={`article-mode-panel-${m}`} role="tab" type="button"
                aria-selected={mode === m} tabIndex={mode === m ? 0 : -1}
                onKeyDown={(event) => handleTabKeyDown(event, m === "write" ? 0 : 1, 2, (index) => setMode(index === 0 ? "write" : "preview"))}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${mode === m ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                {m === "write" ? <><PenLine className="h-3 w-3" /> Escrever</> : <><Eye className="h-3 w-3" /> Prévia</>}
              </button>
            ))}
          </div>
          <Button onClick={submit} disabled={!valid || draft.preparing || status === "submitting"} className="min-h-11 rounded-full px-5 text-sm font-semibold" data-testid="button-publish-article">
            {status === "submitting" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Publicar
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div id="article-mode-panel-write" role="tabpanel" aria-labelledby="article-mode-tab-write" hidden={mode !== "write"} tabIndex={0}>
          <>
            <label htmlFor="article-title" className="sr-only">Título</label>
            <input
              id="article-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do artigo"
              aria-invalid={touched && !!titleError}
              className="w-full border-none bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/60"
              data-testid="input-article-title"
            />
            {touched && titleError && <p className="mt-1 text-xs text-destructive" role="alert">{titleError}</p>}

            <div className="mt-4 flex items-center gap-1 border-y border-border py-1.5" role="toolbar" aria-label="Formatação">
              <button type="button" className={tool} aria-label="Subtítulo" onClick={() => wrap("## ", "", true)}><Heading2 className="h-4 w-4" /></button>
              <button type="button" className={tool} aria-label="Negrito" onClick={() => wrap("**")}><Bold className="h-4 w-4" /></button>
              <button type="button" className={tool} aria-label="Itálico" onClick={() => wrap("*")}><Italic className="h-4 w-4" /></button>
              <button type="button" className={tool} aria-label="Lista" onClick={() => wrap("- ", "", true)}><List className="h-4 w-4" /></button>
              <button type="button" className={tool} aria-label="Citação" onClick={() => wrap("> ", "", true)}><Quote className="h-4 w-4" /></button>
              <span className="ml-auto pr-1 text-[11px] text-muted-foreground">Texto simples · sem HTML</span>
            </div>

            <label htmlFor="article-body" className="sr-only">Corpo do artigo</label>
            <textarea
              id="article-body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Escreva seu artigo. Deixe uma linha em branco entre parágrafos.\n\n## Subtítulo\n- item de lista\n**negrito** *itálico* @menção #hashtag"}
              rows={16}
              aria-invalid={touched && !!bodyError}
              className="mt-3 w-full resize-y border-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground/60"
              data-testid="input-article-body"
            />
            {touched && bodyError && <p className="text-xs text-destructive" role="alert">{bodyError}</p>}
          </>
        </div>
        <div id="article-mode-panel-preview" role="tabpanel" aria-labelledby="article-mode-tab-preview" hidden={mode !== "preview"} tabIndex={0}>
          <article aria-label="Prévia do artigo">
            <h1 className="text-3xl font-bold tracking-tight">{title || <span className="text-muted-foreground">Sem título</span>}</h1>
            <p className="mt-2 text-xs text-muted-foreground">{readingMinutes(body)} min de leitura · por {currentUser?.displayName}</p>
            {draft.media[0]?.type === "image" && <img src={draft.media[0].url} alt="" className="mt-5 max-h-80 w-full rounded-2xl object-cover" />}
            <div className="mt-6">
              {body.trim() ? <ArticleBody body={body} /> : <p className="text-muted-foreground">O corpo do artigo aparece aqui.</p>}
            </div>
          </article>
        </div>

        <MediaDraftGrid media={draft.media} onRemove={draft.remove} />
        {draft.preparing && <p role="status" className="mt-2 text-sm text-muted-foreground">Preparando prévia da mídia…</p>}
        {draft.error && <p role="alert" className="mt-2 text-sm text-destructive">{draft.error}</p>}

        {reference && (
          <div className="mt-6">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sobre este conteúdo — autoria original preservada</p>
            <ReferencePreviewCard reference={reference} onRemove={() => setReference(null)} />
          </div>
        )}

        {status === "error" && <div className="mt-4"><ErrorState message={submitError} onRetry={submit} /></div>}
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <MediaPickerButtons count={draft.media.length} disabled={draft.preparing || status === "submitting"} onAdd={(f, t) => void draft.add(f, t)} />
            <div className="flex gap-1" role="radiogroup" aria-label="Público">
              {audiences.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" role="radio" aria-checked={audience === value} onClick={() => setAudience(value)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${audience === value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
