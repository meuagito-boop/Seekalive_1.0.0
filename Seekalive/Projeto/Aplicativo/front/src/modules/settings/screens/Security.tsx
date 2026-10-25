import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { History, Loader2, MonitorSmartphone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SettingsSubheader, SectionTitle } from "./SettingsSubheader";
import {
  getAuthSessions,
  getTrustedDevices,
  revokeAuthSession,
  revokeOtherAuthSessions,
  revokeOtherTrustedDevices,
  revokeTrustedDevice,
  type AuthSessionView,
  type TrustedDeviceView,
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
  const [devices, setDevices] = useState<TrustedDeviceView[]>([]);
  const [devicesHaveMore, setDevicesHaveMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
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

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    setError(null);
    try {
      const page = await getTrustedDevices();
      setDevices(page.items);
      setDevicesHaveMore(page.hasMore);
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : "Não foi possível carregar as instalações confiáveis.");
      setDevices([]);
      setDevicesHaveMore(false);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void loadDevices();
  }, [loadDevices, loadSessions]);

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

  async function handleRevokeDevice(device: TrustedDeviceView) {
    const confirmation = device.isCurrent
      ? "Remover esta instalação confiável? A sessão atual será encerrada e será necessário confirmar o e-mail para entrar novamente."
      : "Remover esta instalação confiável e encerrar todas as sessões abertas nela?";
    if (!window.confirm(confirmation)) return;
    setPendingAction(device.id);
    setNotice(null);
    setError(null);
    try {
      await revokeTrustedDevice(device.id);
      if (device.isCurrent) {
        window.location.assign("/login");
        return;
      }
      setNotice("Instalação removida e sessões vinculadas encerradas.");
      await Promise.all([loadDevices(), loadSessions()]);
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : "Não foi possível remover a instalação.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRevokeOtherDevices() {
    if (!window.confirm("Revogar todas as outras instalações confiáveis e encerrar as sessões abertas nelas?")) return;
    setPendingAction("other-devices");
    setNotice(null);
    setError(null);
    try {
      const result = await revokeOtherTrustedDevices();
      setNotice(result.revokedCount === 0
        ? "Não havia outras instalações confiáveis."
        : `${result.revokedCount} ${result.revokedCount === 1 ? "instalação removida" : "instalações removidas"}.`);
      await Promise.all([loadDevices(), loadSessions()]);
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : "Não foi possível remover as outras instalações.");
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

        <SectionTitle>Instalações confiáveis</SectionTitle>
        <p className="px-4 pb-3 text-sm leading-6 text-muted-foreground">
          Cada instalação do navegador ou aplicativo recebe um token revogável. O Seekalive não usa IP nem impressão digital para reconhecer o dispositivo. Se os dados do navegador forem apagados, será necessário confirmar o e-mail novamente.
        </p>
        {isLoadingDevices && devices.length === 0 ? (
          <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Carregando instalações…</p>
        ) : devices.length === 0 ? (
          <p className="mx-4 rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
            {error ? "Entre com uma conta autenticada para consultar as instalações." : "Nenhuma instalação confiável encontrada."}
          </p>
        ) : (
          <>
            <ul aria-label="Instalações confiáveis da conta" className="space-y-3 px-4">
              {devices.map((device) => (
                <li key={device.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">
                      {device.isCurrent ? "Esta instalação" : "Instalação do navegador ou aplicativo"}
                    </h3>
                    {device.isCurrent && (
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                        Instalação atual
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Reconhecida em <time dateTime={device.firstSeenAt}>{formatDate(device.firstSeenAt)}</time>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Último acesso <time dateTime={device.lastSeenAt}>{formatDate(device.lastSeenAt)}</time>
                  </p>
                  <Button
                    type="button"
                    variant={device.isCurrent ? "destructive" : "outline"}
                    className="mt-4 min-h-11"
                    disabled={pendingAction !== null}
                    onClick={() => void handleRevokeDevice(device)}
                    aria-label={`Remover instalação reconhecida em ${formatDate(device.firstSeenAt)}`}
                  >
                    {pendingAction === device.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    {device.isCurrent ? "Remover esta instalação" : "Remover instalação"}
                  </Button>
                </li>
              ))}
            </ul>
            {devicesHaveMore && (
              <p className="px-4 pt-3 text-xs text-muted-foreground">
                A lista mostra as 100 instalações mais recentes. Use a opção abaixo para revogar todas as outras, inclusive as mais antigas.
              </p>
            )}
            {devices.some((device) => !device.isCurrent) && (
              <div className="px-4 pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full min-h-11"
                  disabled={pendingAction !== null}
                  onClick={() => void handleRevokeOtherDevices()}
                >
                  {pendingAction === "other-devices" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Revogar todas as outras instalações
                </Button>
              </div>
            )}
          </>
        )}

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
      </motion.div>
    </div>
  );
}
