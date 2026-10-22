import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SettingsSubheader } from "./SettingsSubheader";
import { Switch } from "@/components/ui/switch";
import { getPrivacyPreferences, savePrivacyPreferences } from "@/data/appPreferences";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";

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
      <Switch checked={checked} onCheckedChange={onToggle} aria-label={label} data-testid={testId} />
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
        aria-label={`${label}: ${value}`}
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
  const { currentUser, updateAccount } = useAppContext();
  const { updateUser } = useSocial();
  const [prefs, setPrefs] = useState(() => ({
    ...getPrivacyPreferences(currentUser?.id),
    profilePrivate: currentUser?.isPrivate ?? getPrivacyPreferences(currentUser?.id).profilePrivate,
  }));

  function update<K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) {
    setPrefs(previous => {
      const next = { ...previous, [key]: value };
      savePrivacyPreferences(next, currentUser?.id);
      return next;
    });
    if (key === "profilePrivate" && currentUser) {
      const updated = { ...currentUser, isPrivate: Boolean(value) };
      updateAccount(updated);
      updateUser(updated);
    }
  }

  const requestOptions = [
    { value: "everyone", label: "Todos" },
    { value: "followers", label: "Só seguidores" },
    { value: "nobody", label: "Ninguém" },
  ];
  const messageOptions = [
    { value: "everyone", label: "Todos" },
    { value: "circle", label: "Só pessoas do Círculo" },
    { value: "nobody", label: "Ninguém" },
  ];

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Privacidade" />
      <p className="px-4 pt-3 text-xs text-muted-foreground">As escolhas ficam salvas neste navegador. Perfis privados e regras de Círculo são aplicados aos conteúdos no protótipo.</p>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perfil</p>
        </div>
        <SettingRow
          label="Perfil privado"
          desc="Somente você e pessoas do seu Círculo poderão ver o perfil e suas publicações."
          checked={prefs.profilePrivate}
          onToggle={() => update("profilePrivate", !prefs.profilePrivate)}
          testId="toggle-private-profile"
        />

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quem pode interagir</p>
        </div>
        <SelectRow label="Quem pode pedir para entrar no seu Círculo" value={requestOptions.find(option => option.value === prefs.circleRequests)?.label ?? "Todos"} options={requestOptions.map(option => option.label)} onChange={label => update("circleRequests", requestOptions.find(option => option.label === label)?.value as typeof prefs.circleRequests)} testId="select-circle-requests" />
        <SelectRow label="Quem pode enviar mensagens diretas" value={messageOptions.find(option => option.value === prefs.messages)?.label ?? "Todos"} options={messageOptions.map(option => option.label)} onChange={label => update("messages", messageOptions.find(option => option.label === label)?.value as typeof prefs.messages)} testId="select-messages" />

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagens</p>
        </div>
        <SettingRow label="Confirmações de leitura" desc="Permite que outras pessoas vejam quando você leu mensagens." checked={prefs.readReceipts} onToggle={() => update("readReceipts", !prefs.readReceipts)} testId="toggle-read-receipts" />

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
