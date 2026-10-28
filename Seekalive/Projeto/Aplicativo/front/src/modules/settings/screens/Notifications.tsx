import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SettingsSubheader } from "@/modules/settings/components/SettingsSubheader";
import { Switch } from "@/components/ui/switch";
import { getNotificationPreferences, saveNotificationPreferences } from "@/modules/settings/data/notificationPreferences";
import { useAppContext } from "@/modules/app/state/AppContext";
import { localActorId } from "@/modules/app/persistence/browserAccountStorage";

interface ToggleItem {
  label: string;
  desc?: string;
  key: string;
}

const groups: { title: string; items: ToggleItem[] }[] = [
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
  const { currentUser } = useAppContext();
  const accountId = localActorId(currentUser?.id);
  const [prefs, setPrefs] = useState(() => getNotificationPreferences(accountId));

  useEffect(() => {
    setPrefs(getNotificationPreferences(accountId));
  }, [accountId]);

  function toggle(key: string) {
    setPrefs(prev => {
      const next = { ...prev, categories: { ...prev.categories, [key]: !prev.categories[key] } };
      saveNotificationPreferences(next, accountId);
      return next;
    });
  }

  function toggleChannel(channel: "pushEnabled" | "emailEnabled") {
    setPrefs(prev => {
      const next = { ...prev, [channel]: !prev[channel] };
      saveNotificationPreferences(next, accountId);
      return next;
    });
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Notificações" />
      <p className="px-4 pt-3 text-xs leading-5 text-muted-foreground">As preferências ficam salvas neste navegador. Envio por e-mail e push só funcionará quando os serviços forem conectados.</p>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-sm">Notificações push</p>
              <p className="text-xs text-muted-foreground">No aplicativo e no celular</p>
            </div>
            <Switch checked={prefs.pushEnabled} onCheckedChange={() => toggleChannel("pushEnabled")} aria-label="Notificações push" data-testid="toggle-push" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-sm">Notificações por e-mail</p>
              <p className="text-xs text-muted-foreground">Resumos e alertas por e-mail</p>
            </div>
            <Switch checked={prefs.emailEnabled} onCheckedChange={() => toggleChannel("emailEnabled")} aria-label="Notificações por e-mail" data-testid="toggle-email" />
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
                    checked={prefs.categories[item.key] ?? true}
                    onCheckedChange={() => toggle(item.key)}
                    data-testid={`toggle-${item.key}`}
                    aria-label={item.label}
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
