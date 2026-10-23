import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw, EyeOff } from "lucide-react";

export function UnavailableState({
  title = "Conteúdo indisponível",
  description = "Este conteúdo foi removido ou você não tem permissão para vê-lo.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div role="status" className="mx-4 my-10 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <EyeOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <span className="flex-1 text-foreground">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RotateCcw className="h-3 w-3" aria-hidden /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center text-muted-foreground">
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
