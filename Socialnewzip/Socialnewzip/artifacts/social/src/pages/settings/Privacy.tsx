import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SettingsSubheader, UnavailableNotice } from "./SettingsSubheader";
import { Switch } from "@/components/ui/switch";

function SettingRow({ label, desc, checked, onToggle, testId }: {
  label: string;
  desc?: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-border">
      <div className="flex-1 pr-4">
        <p className="font-medium text-sm">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} disabled aria-label={`${label} (indisponível)`} data-testid={testId} />
    </div>
  );
}

function SelectRow({ label, value, options, onChange, testId }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        disabled
        aria-label={`${label}: ${value} (indisponível)`}
        className="w-full flex items-center justify-between px-4 py-4 border-b border-border disabled:cursor-not-allowed disabled:opacity-70"
        onClick={() => setOpen(v => !v)}
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
  const [privateProfile, setPrivateProfile] = useState(false);
  const [circleRequests, setCircleRequests] = useState("Todos");
  const [messages, setMessages] = useState("Todos");
  const [readReceipts, setReadReceipts] = useState(true);

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Privacidade" />
      <UnavailableNotice>Estas preferências ainda não podem ser alteradas: dependem de um serviço que ainda não está disponível. Os valores mostrados são os padrões.</UnavailableNotice>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perfil</p>
        </div>
        <SettingRow
          label="Perfil privado"
          desc="Quando disponível: só seguidores aprovados verão suas publicações. Hoje não é aplicado."
          checked={privateProfile}
          onToggle={() => setPrivateProfile(v => !v)}
          testId="toggle-private-profile"
        />

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quem pode interagir</p>
        </div>
        <SelectRow label="Enviar solicitações de amizade" value={circleRequests} options={["Todos", "Só seguidores", "Ninguém"]} onChange={setCircleRequests} testId="select-circle-requests" />
        <SelectRow label="Enviar mensagens diretas" value={messages} options={["Todos", "Só amigos", "Ninguém"]} onChange={setMessages} testId="select-messages" />

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagens</p>
        </div>
        <SettingRow label="Confirmações de leitura" desc="Quando disponível: mostrará quando você leu as mensagens. Hoje não é aplicado." checked={readReceipts} onToggle={() => setReadReceipts(v => !v)} testId="toggle-read-receipts" />

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
