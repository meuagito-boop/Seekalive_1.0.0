import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { PrivacyPreferences } from "@/modules/settings/data/preferences";

interface PrivacyPreferencesSectionProps {
  preferences: PrivacyPreferences;
  disabled: boolean;
  onUpdate: <K extends keyof PrivacyPreferences>(key: K, value: PrivacyPreferences[K]) => Promise<void>;
  onOpenBlockedUsers: () => void;
}

const messageOptions = [
  { value: "everyone", label: "Todos" },
  { value: "circle", label: "Só pessoas do Círculo" },
  { value: "nobody", label: "Ninguém" },
] as const;

function SettingRow({
  label,
  description,
  checked,
  onToggle,
  testId,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-4">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} aria-label={label} data-testid={testId} disabled={disabled} />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
  testId,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  testId: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${label}: ${value}`}
        aria-expanded={open}
        className="flex w-full items-center justify-between border-b border-border px-4 py-4 disabled:cursor-not-allowed disabled:opacity-70"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        data-testid={testId}
      >
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{value}</span>
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-4 top-12 z-50 min-w-40 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${option === value ? "font-semibold text-primary" : ""}`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              data-testid={`option-${option}`}
            >
              {option}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function PrivacyPreferencesSection({
  preferences,
  disabled,
  onUpdate,
  onOpenBlockedUsers,
}: PrivacyPreferencesSectionProps) {
  const selectedMessageOption = messageOptions.find((option) => option.value === preferences.messages);

  return (
    <>
      <div className="px-4 pb-1 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfil</p>
      </div>
      <SettingRow
        label="Perfil privado"
        description="Novos seguidores precisam da sua aprovação. Seguidores aprovados veem suas publicações públicas; as publicações do Círculo continuam exigindo seguimento mútuo."
        checked={preferences.profilePrivate}
        onToggle={() => void onUpdate("profilePrivate", !preferences.profilePrivate)}
        testId="toggle-private-profile"
        disabled={disabled}
      />

      <div className="px-4 pb-1 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quem pode interagir</p>
      </div>
      <SelectRow
        label="Quem pode enviar mensagens diretas"
        value={selectedMessageOption?.label ?? "Todos"}
        options={messageOptions.map((option) => option.label)}
        onChange={(label) => {
          const selected = messageOptions.find((option) => option.label === label);
          if (selected) void onUpdate("messages", selected.value);
        }}
        testId="select-messages"
        disabled={disabled}
      />

      <div className="px-4 pb-1 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagens</p>
      </div>
      <SettingRow
        label="Confirmações de leitura"
        description="Permite que outras pessoas vejam quando você leu mensagens."
        checked={preferences.readReceipts}
        onToggle={() => void onUpdate("readReceipts", !preferences.readReceipts)}
        testId="toggle-read-receipts"
        disabled={disabled}
      />

      <div className="px-4 pb-1 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bloqueios</p>
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-between border-b border-border px-4 py-4 transition-colors hover:bg-muted/20"
        onClick={onOpenBlockedUsers}
        data-testid="link-blocked"
      >
        <span className="text-sm font-medium">Usuários bloqueados</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </>
  );
}
