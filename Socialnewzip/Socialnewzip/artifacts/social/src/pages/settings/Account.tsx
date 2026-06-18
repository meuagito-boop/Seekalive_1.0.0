import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsAccount() {
  const [, setLocation] = useLocation();
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center gap-3 px-4 h-14 border-b border-border">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Conta</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="divide-y divide-border">
        <div className="px-4 py-5 space-y-4">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Alterar email</h2>
          <Input placeholder="Novo email" type="email" data-testid="input-new-email" className="h-12 bg-card border-border rounded-xl" />
          <Input placeholder="Senha atual" type="password" data-testid="input-current-password-email" className="h-12 bg-card border-border rounded-xl" />
          <Button className="rounded-xl h-10 px-6" data-testid="button-update-email">Atualizar email</Button>
        </div>

        <div className="px-4 py-5 space-y-4">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Alterar senha</h2>
          <Input placeholder="Senha atual" type="password" data-testid="input-current-password" className="h-12 bg-card border-border rounded-xl" />
          <Input placeholder="Nova senha" type="password" data-testid="input-new-password" className="h-12 bg-card border-border rounded-xl" />
          <Input placeholder="Confirmar nova senha" type="password" data-testid="input-confirm-password" className="h-12 bg-card border-border rounded-xl" />
          <Button className="rounded-xl h-10 px-6" data-testid="button-update-password">Alterar senha</Button>
        </div>

        <div className="px-4 py-5 space-y-4">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Alterar username</h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input placeholder="novo_username" data-testid="input-new-username" className="h-12 bg-card border-border rounded-xl pl-8" />
          </div>
          <Button className="rounded-xl h-10 px-6" data-testid="button-update-username">Atualizar username</Button>
        </div>

        <div className="px-4 py-5 space-y-4">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Contas conectadas</h2>
          {["Google", "Apple"].map(provider => (
            <div key={provider} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
              <span className="font-medium text-sm">{provider}</span>
              <Button variant="outline" size="sm" className="rounded-full h-7 text-xs" data-testid={`button-connect-${provider.toLowerCase()}`}>Conectar</Button>
            </div>
          ))}
        </div>

        <div className="px-4 py-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h2 className="font-bold text-sm text-destructive uppercase tracking-wider">Zona de perigo</h2>
          </div>
          <Button variant="outline" className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5" onClick={() => setShowDeactivate(true)} data-testid="button-deactivate">
            Desativar conta
          </Button>
          <Button variant="destructive" className="w-full rounded-xl" onClick={() => setShowDelete(true)} data-testid="button-delete">
            Deletar conta permanentemente
          </Button>
          {(showDeactivate || showDelete) && (
            <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
              <p className="text-sm font-semibold text-destructive mb-3">
                {showDeactivate ? "Desativar sua conta?" : "Deletar permanentemente?"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {showDeactivate ? "Você poderá reativar sua conta fazendo login novamente." : "Todos os seus dados serão apagados. Isto é irreversível."}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => { setShowDeactivate(false); setShowDelete(false); }}>Cancelar</Button>
                <Button variant="destructive" size="sm" className="flex-1 rounded-xl" data-testid="button-confirm-danger">Confirmar</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
