import { useState } from "react";
import { motion } from "framer-motion";
import { SettingsSubheader, UnavailableNotice } from "./SettingsSubheader";
import { Switch } from "@/components/ui/switch";

interface ToggleItem {
  label: string;
  desc?: string;
  key: string;
}

const groups: { title: string; items: ToggleItem[] }[] = [
  {
    title: "Amigos",
    items: [
      { label: "Solicitações de círculo", desc: "Quando alguém pede para entrar no seu círculo", key: "circle_requests" },
      { label: "Círculo aceito", desc: "Quando sua solicitação é aceita", key: "circle_accepted" },
    ],
  },
  {
    title: "Seguidores",
    items: [
      { label: "Novos seguidores", desc: "Quando alguém começa a te seguir", key: "new_followers" },
    ],
  },
  {
    title: "Menções",
    items: [
      { label: "Menções em publicações", key: "mentions_posts" },
      { label: "Menções em comentários", key: "mentions_comments" },
    ],
  },
  {
    title: "Reações",
    items: [
      { label: "Curtidas", key: "likes" },
      { label: "Repostagens", key: "reposts" },
    ],
  },
  {
    title: "Mensagens",
    items: [
      { label: "Novas mensagens diretas", key: "dm" },
    ],
  },
];

export default function SettingsNotifications() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.flatMap(g => g.items.map(i => [i.key, true])))
  );
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  function toggle(key: string) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Notificações" />
      <UnavailableNotice>As preferências de notificação ainda não podem ser alteradas: não há serviço de envio disponível. Os valores mostrados são os padrões.</UnavailableNotice>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-sm">Notificações push</p>
              <p className="text-xs text-muted-foreground">No aplicativo e no celular</p>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} disabled aria-label="Notificações push (indisponível)" data-testid="toggle-push" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-sm">Notificações por e-mail</p>
              <p className="text-xs text-muted-foreground">Resumos e alertas por e-mail</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} disabled aria-label="Notificações por e-mail (indisponível)" data-testid="toggle-email" />
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-4 pt-5 pb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</p>
            </div>
            <div className="divide-y divide-border border-b border-border">
              {group.items.map(item => (
                <div key={item.key} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-sm">{item.label}</p>
                    {item.desc && <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>}
                  </div>
                  <Switch
                    checked={prefs[item.key] ?? true}
                    onCheckedChange={() => toggle(item.key)}
                    data-testid={`toggle-${item.key}`}
                    disabled
                    aria-label={`${item.label} (indisponível)`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
