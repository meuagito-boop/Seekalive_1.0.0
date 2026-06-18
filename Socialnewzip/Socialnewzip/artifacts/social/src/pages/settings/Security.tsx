import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Smartphone, Monitor, LogOut, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const mockSessions = [
  { id: "s1", device: "MacBook Pro", os: "macOS 14", location: "São Paulo, BR", lastActive: "Agora", isCurrent: true, icon: Monitor },
  { id: "s2", device: "iPhone 15", os: "iOS 17", location: "Rio de Janeiro, BR", lastActive: "2h atrás", isCurrent: false, icon: Smartphone },
  { id: "s3", device: "Chrome / Windows", os: "Windows 11", location: "Lisboa, PT", lastActive: "3 dias atrás", isCurrent: false, icon: Monitor },
];

const mockActivity = [
  { id: "a1", device: "MacBook Pro · macOS", location: "São Paulo, BR", date: "18 Jun 2026, 10:32" },
  { id: "a2", device: "iPhone 15 · iOS", location: "Rio de Janeiro, BR", date: "17 Jun 2026, 18:15" },
  { id: "a3", device: "Chrome · Windows", location: "Lisboa, PT", date: "15 Jun 2026, 09:40" },
];

export default function SettingsSecurity() {
  const [, setLocation] = useLocation();
  const [twoFa, setTwoFa] = useState(false);
  const [sessions, setSessions] = useState(mockSessions);

  function revokeSession(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center gap-3 px-4 h-14 border-b border-border">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Segurança</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Autenticação</p>
        </div>
        <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Autenticação de dois fatores</p>
              <p className="text-xs text-muted-foreground">{twoFa ? "Ativado via app autenticador" : "Adicione uma camada extra de segurança"}</p>
            </div>
          </div>
          <Switch checked={twoFa} onCheckedChange={setTwoFa} data-testid="toggle-2fa" />
        </div>

        {twoFa && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="px-4 py-4 bg-primary/5 border-b border-border">
            <p className="text-xs text-muted-foreground mb-3">Use um app autenticador (ex: Google Authenticator) para escanear o QR Code:</p>
            <div className="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center">
              <div className="grid grid-cols-5 gap-0.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 ${Math.random() > 0.5 ? "bg-black" : "bg-white"}`} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sessões ativas</p>
        </div>
        <div className="divide-y divide-border border-b border-border">
          {sessions.map(session => {
            const Icon = session.icon;
            return (
              <div key={session.id} className="flex items-center gap-3 px-4 py-4" data-testid={`session-${session.id}`}>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{session.device}</p>
                    {session.isCurrent && <span className="text-[10px] bg-green-500/15 text-green-500 rounded-full px-1.5 py-0.5 font-bold">Atual</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{session.os} · {session.location}</p>
                  <p className="text-xs text-muted-foreground">{session.lastActive}</p>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    data-testid={`button-revoke-${session.id}`}
                    className="shrink-0 p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {sessions.filter(s => !s.isCurrent).length > 0 && (
          <div className="px-4 py-3">
            <Button
              variant="outline"
              className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
              onClick={() => setSessions(prev => prev.filter(s => s.isCurrent))}
              data-testid="button-revoke-all"
            >
              Revogar todas as outras sessões
            </Button>
          </div>
        )}

        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico de acesso</p>
        </div>
        <div className="divide-y divide-border border-b border-border">
          {mockActivity.map(activity => (
            <div key={activity.id} className="px-4 py-3" data-testid={`activity-${activity.id}`}>
              <p className="font-medium text-sm">{activity.device}</p>
              <p className="text-xs text-muted-foreground">{activity.location} · {activity.date}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
