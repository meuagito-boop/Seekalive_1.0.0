import { motion, useReducedMotion } from "framer-motion";
import { History, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SettingsSubheader, SectionTitle } from "@/modules/settings/screens/SettingsSubheader";
import { ActiveSessionsSection } from "@/modules/settings/components/security/ActiveSessionsSection";
import { TrustedDevicesSection } from "@/modules/settings/components/security/TrustedDevicesSection";
import { UnavailableSecurityOption } from "@/modules/settings/components/security/UnavailableSecurityOption";
import { useSecuritySettings } from "@/modules/settings/hooks/useSecuritySettings";

export default function SettingsSecurity() {
  const shouldReduceMotion = useReducedMotion();
  const security = useSecuritySettings();

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Segurança" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      >
        {security.error && (
          <p role="alert" className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {security.error}
          </p>
        )}
        {security.notice && (
          <p role="status" className="mx-4 mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
            {security.notice}
          </p>
        )}

        <TrustedDevicesSection
          devices={security.devices}
          devicesHaveMore={security.devicesHaveMore}
          isLoading={security.isLoadingDevices}
          pendingAction={security.pendingAction}
          error={security.error}
          formatDate={security.formatDate}
          onRevokeDevice={(device) => void security.handleRevokeDevice(device)}
          onRevokeOtherDevices={() => void security.handleRevokeOtherDevices()}
        />

        <ActiveSessionsSection
          sessions={security.sessions}
          nextCursor={security.nextCursor}
          isLoading={security.isLoading}
          pendingAction={security.pendingAction}
          error={security.error}
          formatDate={security.formatDate}
          onLoadMore={() => {
            if (security.nextCursor) void security.loadSessions(security.nextCursor, true);
          }}
          onRevokeSession={(session) => void security.handleRevokeSession(session)}
          onRevokeOtherSessions={() => void security.handleRevokeOtherSessions()}
        />

        <SectionTitle>Autenticação em duas etapas</SectionTitle>
        <UnavailableSecurityOption
          icon={Shield}
          title="Verificação em duas etapas"
          description="Ainda não está disponível; nenhuma configuração foi alterada"
          control={<Switch checked={false} disabled aria-label="Verificação em duas etapas (indisponível)" data-testid="toggle-2fa" />}
        />

        <SectionTitle>Histórico de acesso</SectionTitle>
        <UnavailableSecurityOption
          icon={History}
          title="Acessos recentes"
          description="Histórico detalhado de logins ainda não é armazenado"
        />
      </motion.div>
    </div>
  );
}
