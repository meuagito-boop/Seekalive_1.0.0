import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User, Shield, Bell, Palette, Lock, Ban, LogOut,
  ChevronRight, Info
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppContext } from "@/context/AppContext";

const settingsGroups = [
  {
    title: "Conta",
    items: [
      { icon: User, label: "Conta", desc: "Email, senha, username", path: "/settings/account" },
      { icon: Shield, label: "Privacidade e segurança", desc: "Perfil privado, quem pode te contatar", path: "/settings/privacy" },
    ],
  },
  {
    title: "Preferências",
    items: [
      { icon: Bell, label: "Notificações", desc: "Controle o que você recebe", path: "/settings/notifications" },
      { icon: Palette, label: "Aparência", desc: "Fonte e cor de destaque", path: "/settings/appearance" },
    ],
  },
  {
    title: "Segurança e privacidade",
    items: [
      { icon: Lock, label: "Segurança", desc: "2FA, sessões ativas", path: "/settings/security" },
      { icon: Ban, label: "Usuários bloqueados", desc: "Gerencie bloqueios", path: "/settings/blocked" },
    ],
  },
  {
    title: "Sobre",
    items: [
      { icon: Info, label: "Sobre o Orbit", desc: "Versão, termos, privacidade", path: "/settings/about" },
    ],
  },
];

export default function Settings() {
  const [, setLocation] = useLocation();
  const { currentUser, logout } = useAppContext();

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <Header title="Configurações" />

      {currentUser && (
        <div
          className="flex items-center gap-3 px-4 py-4 border-b border-border cursor-pointer hover:bg-muted/20 transition-colors"
          onClick={() => setLocation(`/profile/${currentUser.username}`)}
          data-testid="settings-profile-link"
        >
          <Avatar className="w-14 h-14">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback className="text-lg">{currentUser.displayName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-bold text-base">{currentUser.displayName}</p>
            <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
            <p className="text-xs text-primary mt-0.5">Ver perfil</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

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
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  data-testid={`settings-item-${item.label.toLowerCase().replace(/ /g, '-')}`}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{item.label}</p>
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sessão</p>
      </div>
      <div className="bg-card border-y border-border">
        <button
          onClick={() => { logout(); setLocation("/"); }}
          data-testid="button-logout"
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-destructive" />
          </div>
          <span className="font-medium text-sm text-destructive">Sair</span>
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground py-8">Orbit v1.0.0</p>
    </div>
  );
}
