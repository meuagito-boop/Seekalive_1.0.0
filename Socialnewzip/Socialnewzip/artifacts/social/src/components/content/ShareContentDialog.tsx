import { useState } from "react";
import { useLocation } from "wouter";
import { PenSquare, BookOpenText, Link2, Repeat2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ContentReference } from "@/types/content";
import { articleCreatePath, composePath } from "@/lib/contentLinks";

interface ShareContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: ContentReference;
  /** Human title of what is being shared, for the dialog copy. */
  title: string;
  /** Path to copy as link (relative). Omit to hide the copy option. */
  linkPath?: string;
  /** Only for Social posts: distribution without creating new content. */
  repost?: { active: boolean; onToggle: () => void };
}

export function ShareContentDialog({ open, onOpenChange, reference, title, linkPath, repost }: ShareContentDialogProps) {
  const [, setLocation] = useLocation();
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

  function go(path: string) {
    onOpenChange(false);
    setLocation(path);
  }

  async function copyLink() {
    if (!linkPath) return;
    try {
      const base = window.location.origin + (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      await navigator.clipboard.writeText(base + linkPath);
      setCopyState("done");
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  const option =
    "group flex w-full items-start gap-3 rounded-xl border border-border bg-card/60 p-3 text-left transition-colors hover:border-info/50 hover:bg-info/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-background">
        <DialogHeader>
          <DialogTitle>Compartilhar</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {title}. Sua publicação será sua; o original continua com quem o criou.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <button type="button" className={option} onClick={() => go(composePath(reference))} data-testid="share-create-post">
            <PenSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="block text-sm font-semibold">Criar post comum</span>
              <span className="block text-xs text-muted-foreground">Texto curto ou mídia com este conteúdo anexado.</span>
            </span>
          </button>
          <button type="button" className={option} onClick={() => go(articleCreatePath(reference))} data-testid="share-write-article">
            <BookOpenText className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden />
            <span>
              <span className="block text-sm font-semibold">Escrever artigo</span>
              <span className="block text-xs text-muted-foreground">Análise ou relato longo, com título próprio.</span>
            </span>
          </button>
          {repost && (
            <button
              type="button"
              className={option}
              onClick={() => { repost.onToggle(); onOpenChange(false); }}
              data-testid="share-repost"
            >
              <Repeat2 className={`mt-0.5 h-5 w-5 shrink-0 ${repost.active ? "text-green-500" : "text-muted-foreground"}`} aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{repost.active ? "Desfazer repost" : "Repostar"}</span>
                <span className="block text-xs text-muted-foreground">Distribui o original sem criar conteúdo novo; autoria preservada.</span>
              </span>
            </button>
          )}
          {linkPath && (
            <button type="button" className={option} onClick={copyLink} aria-live="polite">
              {copyState === "done"
                ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
                : <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
              <span>
                <span className="block text-sm font-semibold">
                  {copyState === "done" ? "Link copiado" : copyState === "error" ? "Não foi possível copiar" : "Copiar link"}
                </span>
                <span className="block text-xs text-muted-foreground">Leva direto ao original.</span>
              </span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
