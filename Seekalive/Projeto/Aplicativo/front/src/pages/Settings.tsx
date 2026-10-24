import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User, Shield, Bell, Palette, Lock, Ban, LogOut,
  ChevronRight, Info
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

const settingsGroups = [
  {
    title: "Conta",
    items: [
      { icon: User, label: "Conta", desc: "Dados pessoais ou comerciais e nome de usuário", path: "/settings/account" },
      { icon: Shield, label: "Privacidade", desc: "Visibilidade, pedidos para seguir e Círculo", path: "/settings/privacy" },
    ],
  },
  {
    title: "Preferências",
    items: [
      { icon: Bell, label: "Notificações", desc: "Preferências locais por tipo e canal", path: "/settings/notifications" },
      { icon: Palette, label: "Aparência", desc: "Modo escuro e tamanho do texto", path: "/settings/appearance" },
    ],
  },
  {
    title: "Segurança",
    items: [
      { icon: Lock, label: "Segurança", desc: "Sessões e controle de acesso", path: "/settings/security" },
      { icon: Ban, label: "Usuários bloqueados", desc: "Contas que você bloqueou", path: "/settings/blocked" },
    ],
  },
  {
    title: "Sobre",
    items: [
      { icon: Info, label: "Sobre o Seekalive", desc: "Versão 1.0.0 · termos e política de privacidade ainda não publicados", path: "", unavailable: true },
    ],
  },
];

export default function Settings() {
  const [, setLocation] = useLocation();
  const { logout } = useAppContext();

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <h1 className="px-4 pt-5 pb-1 sk-text-page-title">Configurações</h1>


      {settingsGroups.map((group, gi) => (
        <motion.div
          key={group.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.07 }}
        >
          <div className="px-4 pt-5 pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</p>
          </div>
          <div className="bg-card border-y border-border divide-y divide-border">
            {group.items.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={"unavailable" in item && item.unavailable}
                  aria-disabled={"unavailable" in item && item.unavailable ? true : undefined}
                  onClick={() => item.path && setLocation(item.path)}
                  data-testid={`settings-item-${item.label.toLowerCase().replace(/ /g, '-')}`}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">
                      {item.label}
                      {"unavailable" in item && item.unavailable && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Indisponível</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </motion.div>
      ))}

      <div className="px-4 pt-5 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acesso</p>
      </div>
      <div className="bg-card border-y border-border">
        <button
          onClick={() => { void logout().finally(() => setLocation("/")); }}
          data-testid="button-logout"
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-destructive" />
          </div>
          <span className="font-medium text-sm text-destructive">Sair da conta</span>
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground py-8">Seekalive v1.0.0</p>
    </div>
  );
}
