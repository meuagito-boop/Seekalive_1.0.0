import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { History, Loader2, MonitorSmartphone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ActiveSessionsSection } from "@/modules/settings/components/security/ActiveSessionsSection";
import { TrustedDevicesSection } from "@/modules/settings/components/security/TrustedDevicesSection";
import { SettingsSubheader, SectionTitle } from "@/modules/settings/components/SettingsSubheader";
import {
  getAuthSessions,
  getTrustedDevices,
  revokeAuthSession,
  revokeOtherAuthSessions,
  revokeOtherTrustedDevices,
  revokeTrustedDevice,
  type AuthSessionView,
  type TrustedDeviceView,
} from "@/modules/auth/services/sessionApi";

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

        <TrustedDevicesSection
          devices={devices}
          devicesHaveMore={devicesHaveMore}
          isLoading={isLoadingDevices}
          pendingAction={pendingAction}
          error={error}
          onRevokeDevice={(device) => void handleRevokeDevice(device)}
          onRevokeOtherDevices={() => void handleRevokeOtherDevices()}
          formatDate={formatDate}
        />

        <ActiveSessionsSection
          sessions={sessions}
          nextCursor={nextCursor}
          isLoading={isLoading}
          pendingAction={pendingAction}
          error={error}
          onRevokeSession={(session) => void handleRevokeSession(session)}
          onRevokeOtherSessions={() => void handleRevokeOtherSessions()}
          onLoadMore={(cursor) => void loadSessions(cursor, true)}
          formatDate={formatDate}
        />

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
