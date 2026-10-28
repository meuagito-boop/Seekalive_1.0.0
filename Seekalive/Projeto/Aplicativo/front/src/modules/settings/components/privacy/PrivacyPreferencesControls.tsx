import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { PrivacyPreferences } from "@/modules/settings/data/privacyPreferences";

const messageOptions = [
  { value: "everyone", label: "Todos" },
  { value: "circle", label: "Só pessoas do Círculo" },
  { value: "nobody", label: "Ninguém" },
] as const;

interface PrivacyPreferencesControlsProps {
  preferences: PrivacyPreferences;
  disabled: boolean;
  onUpdate: <K extends keyof PrivacyPreferences>(
    key: K,
    value: PrivacyPreferences[K],
  ) => void;
}

function SettingRow({
  label,
  desc,
  checked,
  onToggle,
  testId,
  disabled,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-border">
      <div className="flex-1 pr-4">
        <p className="font-medium text-sm">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={label}
        data-testid={testId}
        disabled={disabled}
      />
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
        className="w-full flex items-center justify-between px-4 py-4 border-b border-border disabled:cursor-not-allowed disabled:opacity-70"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        data-testid={testId}
      >
        <span className="font-medium text-sm">{label}</span>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>{value}</span>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-4 top-12 bg-card border border-border rounded-xl shadow-2xl z-50 min-w-40 overflow-hidden"
        >
          {options.map((option) => (
            <button
              key={option}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors ${option === value ? "text-primary font-semibold" : ""}`}
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

export function PrivacyPreferencesControls({
  preferences,
  disabled,
  onUpdate,
}: PrivacyPreferencesControlsProps) {
  const selectedMessageLabel =
    messageOptions.find((option) => option.value === preferences.messages)
      ?.label ?? "Todos";

  return (
    <>
      <div className="px-4 pt-5 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Perfil
        </p>
      </div>
      <SettingRow
        label="Perfil privado"
        desc="Novos seguidores precisam da sua aprovação. Seguidores aprovados veem suas publicações públicas; as publicações do Círculo continuam exigindo seguimento mútuo."
        checked={preferences.profilePrivate}
        onToggle={() => onUpdate("profilePrivate", !preferences.profilePrivate)}
        testId="toggle-private-profile"
        disabled={disabled}
      />

      <div className="px-4 pt-5 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quem pode interagir
        </p>
      </div>
      <SelectRow
        label="Quem pode enviar mensagens diretas"
        value={selectedMessageLabel}
        options={messageOptions.map((option) => option.label)}
        onChange={(label) => {
          const selected = messageOptions.find(
            (option) => option.label === label,
          );
          if (selected) onUpdate("messages", selected.value);
        }}
        testId="select-messages"
        disabled={disabled}
      />

      <div className="px-4 pt-5 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Mensagens
        </p>
      </div>
      <SettingRow
        label="Confirmações de leitura"
        desc="Permite que outras pessoas vejam quando você leu mensagens."
        checked={preferences.readReceipts}
        onToggle={() => onUpdate("readReceipts", !preferences.readReceipts)}
        testId="toggle-read-receipts"
        disabled={disabled}
      />
    </>
  );
}
