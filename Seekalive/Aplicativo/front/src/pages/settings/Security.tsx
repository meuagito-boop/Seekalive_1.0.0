import { motion } from "framer-motion";
import { Shield, MonitorSmartphone, History } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SettingsSubheader, SectionTitle, UnavailableNotice } from "./SettingsSubheader";

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
  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Segurança" />
      <UnavailableNotice>
        Os recursos de segurança dependem do serviço de autenticação, que ainda não está disponível. Nada nesta tela foi ativado ou alterado.
      </UnavailableNotice>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <SectionTitle>Autenticação</SectionTitle>
        <UnavailableRow
          icon={Shield}
          title="Verificação em duas etapas"
          desc="Indisponível — ainda não é possível ativar"
          control={<Switch checked={false} disabled aria-label="Verificação em duas etapas (indisponível)" data-testid="toggle-2fa" />}
        />

        <SectionTitle>Sessões ativas</SectionTitle>
        <UnavailableRow icon={MonitorSmartphone} title="Dispositivos conectados" desc="A lista de sessões e a revogação ainda não estão disponíveis" />

        <SectionTitle>Histórico de acesso</SectionTitle>
        <UnavailableRow icon={History} title="Acessos recentes" desc="O histórico de acesso ainda não está disponível" />
      </motion.div>
    </div>
  );
}
