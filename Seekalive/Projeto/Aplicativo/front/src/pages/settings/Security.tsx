import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { History, Loader2, MonitorSmartphone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SettingsSubheader, SectionTitle, UnavailableNotice } from "./SettingsSubheader";
import {
  getAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  type AuthSessionView,
} from "@/services/authApi";

function UnavailableRow({ icon: Icon, title, desc, control }: { icon: React.ElementType; title: string; desc: string; control?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-border bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {control}
    </div>
  );
}

export default function SettingsSecurity() {
  const shouldReduceMotion = useReducedMotion();
  const [sessions, setSessions] = useState<AuthSessionView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSessions = useCallback(async (cursor?: string, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await getAuthSessions(cursor);
      setSessions((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : "Não foi possível carregar as sessões.");
      if (!append) setSessions([]);
      setNextCursor(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function handleRevokeSession(session: AuthSessionView) {
    if (session.isCurrent || !window.confirm("Encerrar esta sessão? O dispositivo precisará entrar novamente.")) return;
    setPendingAction(session.id);
    setNotice(null);
    setError(null);
    try {
      await revokeAuthSession(session.id);
      setNotice("Sessão encerrada.");
      await loadSessions();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível encerrar a sessão.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRevokeOtherSessions() {
    if (!window.confirm("Encerrar todas as outras sessões? Esta sessão continuará conectada.")) return;
    setPendingAction("others");
    setNotice(null);
    setError(null);
    try {
      const result = await revokeOtherAuthSessions();
      setNotice(result.revokedCount === 0
        ? "Não havia outras sessões ativas."
        : `${result.revokedCount} ${result.revokedCount === 1 ? "sessão encerrada" : "sessões encerradas"}.`);
      await loadSessions();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível encerrar as outras sessões.");
    } finally {
      setPendingAction(null);
    }
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Segurança" />
      <UnavailableNotice>
        Você pode revisar e encerrar sessões. Esta lista não usa impressão digital, IP ou identificação do navegador; por isso, o Seekalive não reconhece um aparelho como “habitual”.
      </UnavailableNotice>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      >
        {error && (
          <p role="alert" className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mx-4 mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
            {notice}
          </p>
        )}

        <SectionTitle>Sessões ativas</SectionTitle>
        <p className="px-4 pb-3 text-sm text-muted-foreground">
          Cada entrada corresponde a um login. Encerre acessos que você não reconhece; a sessão atual fica identificada.
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
                    <h3 className="font-semibold text-sm">
                      {session.isCurrent ? "Esta sessão" : "Outra sessão"}
                    </h3>
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
                      onClick={() => void handleRevokeSession(session)}
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
                  className="w-full min-h-11"
                  disabled={pendingAction !== null}
                  onClick={() => void handleRevokeOtherSessions()}
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
                  className="w-full min-h-11"
                  disabled={isLoading}
                  onClick={() => void loadSessions(nextCursor, true)}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Carregar mais sessões
                </Button>
              </div>
            )}
          </>
        )}

        <SectionTitle>Autenticação em duas etapas</SectionTitle>
        <UnavailableRow
          icon={Shield}
          title="Verificação em duas etapas"
          desc="Ainda não está disponível; nenhuma configuração foi alterada"
          control={<Switch checked={false} disabled aria-label="Verificação em duas etapas (indisponível)" data-testid="toggle-2fa" />}
        />

        <SectionTitle>Histórico de acesso</SectionTitle>
        <UnavailableRow icon={History} title="Acessos recentes" desc="Histórico detalhado de logins ainda não é armazenado" />
        <UnavailableRow icon={MonitorSmartphone} title="Dispositivo habitual" desc="O app não identifica nem confia automaticamente em dispositivos" />
      </motion.div>
    </div>
  );
}
