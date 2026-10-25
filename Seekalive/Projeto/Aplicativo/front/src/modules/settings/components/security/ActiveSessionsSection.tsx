import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/modules/settings/screens/SettingsSubheader";
import type { AuthSessionView } from "@/modules/auth/services/sessionApi";

interface ActiveSessionsSectionProps {
  sessions: AuthSessionView[];
  nextCursor: string | null;
  isLoading: boolean;
  pendingAction: string | null;
  error: string | null;
  formatDate: (value: string) => string;
  onLoadMore: () => void;
  onRevokeSession: (session: AuthSessionView) => void;
  onRevokeOtherSessions: () => void;
}

export function ActiveSessionsSection({
  sessions,
  nextCursor,
  isLoading,
  pendingAction,
  error,
  formatDate,
  onLoadMore,
  onRevokeSession,
  onRevokeOtherSessions,
}: ActiveSessionsSectionProps) {
  return (
    <>
      <SectionTitle>Sessões ativas</SectionTitle>
      <p className="px-4 pb-3 text-sm text-muted-foreground">
        Cada entrada corresponde a um login ativo. Encerrar uma sessão não remove a instalação confiável; remova-a acima se também quiser exigir confirmação de e-mail no próximo acesso.
      </p>
      {isLoading && sessions.length === 0 ? (
        <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Carregando sessões…</p>
      ) : sessions.length === 0 ? (
        <p className="mx-4 rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          {error ? "Entre com uma conta autenticada para consultar suas sessões." : "Nenhuma sessão ativa encontrada."}
        </p>
      ) : (
        <>
          <ul aria-label="Sessões ativas da conta" className="space-y-3 px-4">
            {sessions.map((session) => (
              <li key={session.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{session.isCurrent ? "Esta sessão" : "Outra sessão"}</h3>
                  {session.isCurrent && (
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      Sessão atual
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Iniciada em <time dateTime={session.createdAt}>{formatDate(session.createdAt)}</time>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Expira em <time dateTime={session.expiresAt}>{formatDate(session.expiresAt)}</time>
                </p>
                {!session.isCurrent && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 min-h-11"
                    disabled={pendingAction !== null}
                    onClick={() => onRevokeSession(session)}
                    aria-label={`Encerrar sessão iniciada em ${formatDate(session.createdAt)}`}
                  >
                    {pendingAction === session.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Encerrar sessão
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {sessions.some((session) => !session.isCurrent) && (
            <div className="px-4 pt-4">
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full"
                disabled={pendingAction !== null}
                onClick={onRevokeOtherSessions}
              >
                {pendingAction === "others" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Encerrar todas as outras sessões
              </Button>
            </div>
          )}
          {nextCursor && (
            <div className="px-4 py-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                disabled={isLoading}
                onClick={onLoadMore}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Carregar mais sessões
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
