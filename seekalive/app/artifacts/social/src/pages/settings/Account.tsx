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
  const { users, updateUser } = useSocial();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? "");
  const [age, setAge] = useState(currentUser?.age?.toString() ?? "");
  const [address, setAddress] = useState(currentUser?.address ?? "");
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode ?? "");
  const [city, setCity] = useState(currentUser?.city ?? "");
  const [state, setState] = useState(currentUser?.state ?? "");
  const [country, setCountry] = useState(currentUser?.country ?? "");

  function submitProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentUser) return;
    if (displayName.trim().length < 2 || !Number.isInteger(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      setProfileError("Informe um nome e uma idade válida entre 1 e 120 anos.");
      return;
    }
    if (currentUser.accountType === "commercial" &&
      [address, postalCode, city, state, country].some(value => value.trim().length < 2)) {
      setProfileError("Preencha endereço, CEP, cidade, estado e país.");
      return;
    }
    const updated = {
      ...currentUser,
      displayName: displayName.trim(),
      age: Number(age),
      address: currentUser.accountType === "commercial" ? address.trim() : currentUser.address,
      postalCode: currentUser.accountType === "commercial" ? postalCode.trim() : currentUser.postalCode,
      city: currentUser.accountType === "commercial" ? city.trim() : currentUser.city,
      state: currentUser.accountType === "commercial" ? state.trim() : currentUser.state,
      country: currentUser.accountType === "commercial" ? country.trim() : currentUser.country,
      location: currentUser.accountType === "commercial" ? `${city.trim()}, ${state.trim()}, ${country.trim()}` : currentUser.location,
      commercialProfile: currentUser.accountType === "commercial" && currentUser.commercialProfile
        ? { ...currentUser.commercialProfile, address: `${address.trim()}, ${city.trim()}, ${state.trim()} ${postalCode.trim()}, ${country.trim()}`, cityName: city.trim(), cityState: state.trim() }
        : currentUser.commercialProfile,
    };
    setProfileError(null);
    updateAccount(updated);
    updateUser(updated);
    toast({ title: "Perfil atualizado", description: "Os dados foram salvos neste navegador." });
  }

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
    const updated = { ...currentUser, username: next };
    updateAccount(updated);
    updateUser(updated);
    setUsername("");
    toast({ title: "Nome de usuário alterado", description: `Agora você é @${next} neste navegador.` });
  }

  const disabledField = "h-12 bg-card border-border rounded-xl";

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Conta" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
        <SectionTitle>{currentUser?.accountType === "commercial" ? "Dados comerciais" : "Dados pessoais"}</SectionTitle>
        <form onSubmit={submitProfile} className="px-4 pt-2 space-y-3">
          <Input value={displayName} onChange={event => setDisplayName(event.target.value)} aria-label={currentUser?.accountType === "commercial" ? "Nome comercial" : "Nome completo"} placeholder={currentUser?.accountType === "commercial" ? "Nome da empresa ou prestador" : "Nome completo"} className="h-12 bg-card border-border rounded-xl" />
          <Input value={age} onChange={event => setAge(event.target.value)} type="number" min={1} max={120} aria-label="Idade" placeholder="Idade" className="h-12 bg-card border-border rounded-xl" />
          {currentUser?.accountType === "commercial" && (
            <>
              <Input value={address} onChange={event => setAddress(event.target.value)} aria-label="Endereço" placeholder="Endereço" className="h-12 bg-card border-border rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={postalCode} onChange={event => setPostalCode(event.target.value)} aria-label="CEP" placeholder="CEP" className="h-12 bg-card border-border rounded-xl" />
                <Input value={city} onChange={event => setCity(event.target.value)} aria-label="Cidade" placeholder="Cidade" className="h-12 bg-card border-border rounded-xl" />
                <Input value={state} onChange={event => setState(event.target.value)} aria-label="Estado" placeholder="Estado" className="h-12 bg-card border-border rounded-xl" />
                <Input value={country} onChange={event => setCountry(event.target.value)} aria-label="País" placeholder="País" className="h-12 bg-card border-border rounded-xl" />
              </div>
            </>
          )}
          <Input value={currentUser?.email ?? ""} readOnly type="email" aria-label="E-mail de cadastro" placeholder="E-mail de cadastro" className="h-12 bg-card border-border rounded-xl opacity-70" />
          <p className="text-xs text-muted-foreground">E-mail e senha só poderão ser alterados após conectar o serviço de autenticação. Senhas não são salvas localmente.</p>
          {profileError && <p role="alert" className="text-xs text-destructive">{profileError}</p>}
          <Button type="submit" className="rounded-xl h-10 px-6" data-testid="button-save-profile">Salvar dados do perfil</Button>
        </form>

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
