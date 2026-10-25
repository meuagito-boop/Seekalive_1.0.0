import { useCallback, useEffect, useState } from "react";
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

export function useSecuritySettings() {
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

  return {
    sessions,
    devices,
    devicesHaveMore,
    nextCursor,
    isLoading,
    isLoadingDevices,
    pendingAction,
    error,
    notice,
    loadSessions,
    handleRevokeSession,
    handleRevokeOtherSessions,
    handleRevokeDevice,
    handleRevokeOtherDevices,
    formatDate,
  };
}
