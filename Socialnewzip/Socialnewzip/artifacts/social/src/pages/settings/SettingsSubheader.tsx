import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Info } from "lucide-react";

/** Subcabeçalho das páginas de configurações: fica abaixo do cabeçalho principal (top-14). */
export function SettingsSubheader({ title }: { title: string }) {
  return (
    <div className="sticky top-14 z-30 bg-background/90 backdrop-blur-lg flex items-center gap-3 px-4 h-14 border-b border-border">
      <Link
        href="/settings"
        aria-label="Voltar para Configurações"
        data-testid="button-back"
        className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <h1 className="font-bold text-lg">{title}</h1>
    </div>
  );
}

/** Aviso honesto para recursos que ainda dependem de serviço não disponível. */
export function UnavailableNotice({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="mx-4 mt-4 flex gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{children}</h2>
    </div>
  );
}
