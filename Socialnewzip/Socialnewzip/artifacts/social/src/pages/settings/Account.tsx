import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";
import { useToast } from "@/hooks/use-toast";
import { SettingsSubheader, SectionTitle, UnavailableNotice } from "./SettingsSubheader";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function SettingsAccount() {
  const { currentUser, updateAccount } = useAppContext();
  const { users } = useSocial();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submitUsername(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentUser) return;
    const next = username.trim().toLowerCase().replace(/^@/, "");
    if (!USERNAME_RE.test(next)) {
      setError("Use de 3 a 20 caracteres: letras minúsculas, números ou _.");
      return;
    }
    if (next === currentUser.username) {
      setError("Esse já é o seu nome de usuário.");
      return;
    }
    if (users.some((u) => u.id !== currentUser.id && u.username.toLowerCase() === next)) {
      setError("Esse nome de usuário já está em uso.");
      return;
    }
    setError(null);
    updateAccount({ ...currentUser, username: next });
    setUsername("");
    toast({ title: "Nome de usuário alterado", description: `Agora você é @${next} neste navegador.` });
  }

  const disabledField = "h-12 bg-card border-border rounded-xl";

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Conta" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
        <SectionTitle>Nome de usuário</SectionTitle>
        <form onSubmit={submitUsername} className="px-4 pt-2 space-y-3" noValidate>
          <p className="text-xs text-muted-foreground">
            Atual: <span className="font-semibold text-foreground">@{currentUser?.username}</span>. A alteração vale para a conta salva neste navegador.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" aria-hidden>@</span>
            <Input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              placeholder="novo_usuario"
              aria-label="Novo nome de usuário"
              aria-invalid={!!error}
              aria-describedby={error ? "username-error" : undefined}
              autoCapitalize="none"
              autoComplete="username"
              data-testid="input-new-username"
              className={`${disabledField} pl-8`}
            />
          </div>
          {error && <p id="username-error" role="alert" className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="rounded-xl h-10 px-6" disabled={!username.trim()} data-testid="button-update-username">
            Atualizar nome de usuário
          </Button>
        </form>

        <SectionTitle>E-mail e senha</SectionTitle>
        <UnavailableNotice>Alterar e-mail e senha depende do serviço de autenticação, que ainda não está disponível.</UnavailableNotice>
        <div className="px-4 pt-3 space-y-3">
          <Input disabled placeholder="Novo e-mail" type="email" aria-label="Novo e-mail (indisponível)" data-testid="input-new-email" className={disabledField} />
          <Input disabled placeholder="Nova senha" type="password" aria-label="Nova senha (indisponível)" data-testid="input-new-password" className={disabledField} />
          <Button disabled className="rounded-xl h-10 px-6" data-testid="button-update-password">Indisponível</Button>
        </div>

        <SectionTitle>Contas conectadas</SectionTitle>
        <div className="px-4 pt-2 space-y-2">
          {["Google", "Apple"].map((provider) => (
            <div key={provider} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
              <span className="font-medium text-sm">{provider}</span>
              <Button disabled variant="outline" size="sm" className="rounded-full h-8 text-xs" data-testid={`button-connect-${provider.toLowerCase()}`}>
                Indisponível
              </Button>
            </div>
          ))}
        </div>

        <div className="px-4 pt-6 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden />
          <h2 className="font-bold text-xs text-destructive uppercase tracking-wider">Zona de perigo</h2>
        </div>
        <UnavailableNotice>Desativar ou excluir a conta ainda não está disponível. Nenhum dado foi alterado.</UnavailableNotice>
        <div className="px-4 pt-3 space-y-2">
          <Button disabled variant="outline" className="w-full rounded-xl border-destructive/40 text-destructive" data-testid="button-deactivate">Desativar conta</Button>
          <Button disabled variant="destructive" className="w-full rounded-xl" data-testid="button-delete">Excluir conta permanentemente</Button>
        </div>
      </motion.div>
    </div>
  );
}
