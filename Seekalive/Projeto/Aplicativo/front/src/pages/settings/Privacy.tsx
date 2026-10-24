import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, ChevronRight, X } from "lucide-react";
import { SettingsSubheader } from "./SettingsSubheader";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPrivacyPreferences, savePrivacyPreferences } from "@/data/appPreferences";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";
import { toast } from "@/hooks/use-toast";
import { socialGraphApi } from "@/services/socialGraphApi";

function SettingRow({ label, desc, checked, onToggle, testId, disabled = false }: {
  label: string;
  desc?: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-border">
      <div className="flex-1 pr-4">
        <p className="font-medium text-sm">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} aria-label={label} data-testid={testId} disabled={disabled} />
    </div>
  );
}

function SelectRow({ label, value, options, onChange, testId, disabled = false }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  testId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${label}: ${value}`}
        className="w-full flex items-center justify-between px-4 py-4 border-b border-border disabled:cursor-not-allowed disabled:opacity-70"
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        data-testid={testId}
      >
        <span className="font-medium text-sm">{label}</span>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>{value}</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="absolute right-4 top-12 bg-card border border-border rounded-xl shadow-2xl z-50 min-w-40 overflow-hidden"
        >
          {options.map(opt => (
            <button key={opt} className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors ${opt === value ? "text-primary font-semibold" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }} data-testid={`option-${opt}`}>{opt}</button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function SettingsPrivacy() {
  const [, setLocation] = useLocation();
  const { currentUser, updateAccount } = useAppContext();
  const {
    updateUser,
    incomingFollowRequests,
    getUserById,
    acceptFollowRequest,
    declineFollowRequest,
    isRemoteSocialSession,
    socialGraphLoading,
    socialGraphError,
    retrySocialGraph,
    upsertRemoteUser,
  } = useSocial();
  const [prefs, setPrefs] = useState(() => ({
    ...getPrivacyPreferences(currentUser?.id),
    profilePrivate: currentUser?.isPrivate ?? getPrivacyPreferences(currentUser?.id).profilePrivate,
  }));
  const [privacyVersion, setPrivacyVersion] = useState<number | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(isRemoteSocialSession);
  const [saving, setSaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [workingRequestId, setWorkingRequestId] = useState<string | null>(null);
  const [privacyRetry, setPrivacyRetry] = useState(0);

  useEffect(() => {
    if (!isRemoteSocialSession) {
      setPrivacyLoading(false);
      return;
    }
    let active = true;
    setPrivacyLoading(true);
    setPrivacyError(null);
    void socialGraphApi.getPrivacySettings()
      .then((settings) => {
        if (!active) return;
        setPrefs({
          profilePrivate: settings.profileVisibility === "private",
          messages: settings.messages,
          readReceipts: settings.readReceipts,
        });
        setPrivacyVersion(settings.version);
      })
      .catch((error: unknown) => {
        if (active) {
          setPrivacyError(error instanceof Error ? error.message : "Não foi possível carregar as configurações.");
        }
      })
      .finally(() => {
        if (active) setPrivacyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, currentUser?.id, privacyRetry]);

  async function update<K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) {
    const next = { ...prefs, [key]: value };
    if (isRemoteSocialSession) {
      if (!currentUser || privacyVersion === null) return;
      setSaving(true);
      setPrivacyError(null);
      try {
        const settings = await socialGraphApi.updatePrivacySettings({
          profileVisibility: next.profilePrivate ? "private" : "public",
          messages: next.messages,
          readReceipts: next.readReceipts,
          version: privacyVersion,
        });
        setPrefs({
          profilePrivate: settings.profileVisibility === "private",
          messages: settings.messages,
          readReceipts: settings.readReceipts,
        });
        setPrivacyVersion(settings.version);
        if (key === "profilePrivate") {
          const updated = { ...currentUser, isPrivate: settings.profileVisibility === "private" };
          updateAccount(updated);
          upsertRemoteUser(updated);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível salvar a configuração.";
        setPrivacyError(message);
        toast({ title: "Configuração não salva", description: message, variant: "destructive" });
        if ((error as { status?: number })?.status === 409) {
          try {
            const latest = await socialGraphApi.getPrivacySettings();
            setPrefs({
              profilePrivate: latest.profileVisibility === "private",
              messages: latest.messages,
              readReceipts: latest.readReceipts,
            });
            setPrivacyVersion(latest.version);
          } catch {
            // Keep the version-conflict message visible; do not overwrite local values with stale data.
          }
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    setPrefs(previous => {
      const updated = { ...previous, [key]: value };
      savePrivacyPreferences(updated, currentUser?.id);
      return updated;
    });
    if (key === "profilePrivate" && currentUser) {
      const updated = { ...currentUser, isPrivate: Boolean(value) };
      updateAccount(updated);
      updateUser(updated);
    }
  }

  const messageOptions = [
    { value: "everyone", label: "Todos" },
    { value: "circle", label: "Só pessoas do Círculo" },
    { value: "nobody", label: "Ninguém" },
  ];

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Privacidade" />
      <p className="px-4 pt-3 text-xs text-muted-foreground">
        {isRemoteSocialSession
          ? "As configurações são salvas na sua conta."
          : "As escolhas ficam salvas neste navegador. Perfis privados e regras de Círculo são aplicados no protótipo."}
      </p>
      {privacyError && (
        <p role="alert" className="px-4 pt-3 text-sm text-destructive">
          {privacyError}{" "}
          {isRemoteSocialSession && privacyVersion === null && (
            <button type="button" className="font-semibold underline" onClick={() => setPrivacyRetry((value) => value + 1)}>
              Tentar novamente
            </button>
          )}
        </p>
      )}
      {privacyLoading && <p role="status" className="px-4 pt-3 text-sm text-muted-foreground">Carregando configurações…</p>}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-4 pt-5 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Solicitações para seguir ({incomingFollowRequests.length})
          </p>
        </div>
        {socialGraphError && (
          <p role="alert" className="px-4 pb-3 text-sm text-destructive">
            {socialGraphError}{" "}
            <button type="button" className="font-semibold underline" onClick={retrySocialGraph}>Tentar novamente</button>
          </p>
        )}
        {socialGraphLoading && incomingFollowRequests.length === 0 ? (
          <p role="status" className="px-4 pb-4 text-sm text-muted-foreground">Carregando solicitações…</p>
        ) : incomingFollowRequests.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">Você não tem solicitações pendentes.</p>
        ) : (
          <div className="divide-y divide-border border-y border-border bg-card">
            {incomingFollowRequests.map(request => {
              const requester = getUserById(request.requesterId);
              return (
                <div key={request.id} className="flex items-center gap-3 px-4 py-3" data-testid={`follow-request-${request.id}`}>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={requester?.avatarUrl} alt="" />
                    <AvatarFallback>{requester?.displayName?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{requester?.displayName ?? "Conta indisponível"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {requester ? `@${requester.username} quer seguir você` : "Esta conta não está disponível no protótipo."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={workingRequestId === request.id || privacyLoading}
                    onClick={async () => {
                      setWorkingRequestId(request.id);
                      await acceptFollowRequest(request.id);
                      setWorkingRequestId(null);
                    }}
                    aria-label={`Aceitar solicitação de ${requester?.displayName ?? "conta"}`}
                    data-testid={`accept-follow-request-${request.id}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={workingRequestId === request.id || privacyLoading}
                    onClick={async () => {
                      setWorkingRequestId(request.id);
                      await declineFollowRequest(request.id);
                      setWorkingRequestId(null);
                    }}
                    aria-label={`Recusar solicitação de ${requester?.displayName ?? "conta"}`}
                    data-testid={`decline-follow-request-${request.id}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perfil</p>
        </div>
        <SettingRow
          label="Perfil privado"
          desc="Novos seguidores precisam da sua aprovação. Seguidores aprovados veem suas publicações públicas; as publicações do Círculo continuam exigindo seguimento mútuo."
          checked={prefs.profilePrivate}
          onToggle={() => void update("profilePrivate", !prefs.profilePrivate)}
          testId="toggle-private-profile"
          disabled={privacyLoading || saving || (isRemoteSocialSession && privacyVersion === null)}
        />

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quem pode interagir</p>
        </div>
        <SelectRow label="Quem pode enviar mensagens diretas" value={messageOptions.find(option => option.value === prefs.messages)?.label ?? "Todos"} options={messageOptions.map(option => option.label)} onChange={label => void update("messages", messageOptions.find(option => option.label === label)?.value as typeof prefs.messages)} testId="select-messages" disabled={privacyLoading || saving || (isRemoteSocialSession && privacyVersion === null)} />

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagens</p>
        </div>
        <SettingRow label="Confirmações de leitura" desc="Permite que outras pessoas vejam quando você leu mensagens." checked={prefs.readReceipts} onToggle={() => void update("readReceipts", !prefs.readReceipts)} testId="toggle-read-receipts" disabled={privacyLoading || saving || (isRemoteSocialSession && privacyVersion === null)} />

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bloqueios</p>
        </div>
        <button
          className="w-full flex items-center justify-between px-4 py-4 border-b border-border hover:bg-muted/20 transition-colors"
          onClick={() => setLocation("/settings/blocked")}
          data-testid="link-blocked"
        >
          <span className="font-medium text-sm">Usuários bloqueados</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>
    </div>
  );
}
