import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import type { User } from "@/modules/profile/types/user";
import { useToast } from "@/hooks/use-toast";
import { myAccountToUser, socialGraphApi, SocialGraphApiError } from "@/modules/social/services/socialGraphApi";
import type { MyAccountResponse } from "@workspace/api-client-react";
import { AccountEmailChange } from "@/modules/settings/components/account/AccountEmailChange";
import { AccountPasswordChange } from "@/modules/settings/components/account/AccountPasswordChange";
import { SettingsSubheader, SectionTitle, UnavailableNotice } from "./SettingsSubheader";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type AccountDraft = {
  firstName: string;
  lastName: string;
  businessName: string;
  address: string;
  postalCode: string;
  cityName: string;
  stateName: string;
  countryName: string;
};

const emptyDraft: AccountDraft = {
  firstName: "",
  lastName: "",
  businessName: "",
  address: "",
  postalCode: "",
  cityName: "",
  stateName: "",
  countryName: "",
};

function draftFromUser(user: User | null): AccountDraft {
  if (!user) return emptyDraft;
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    businessName: user.displayName,
    address: user.address ?? "",
    postalCode: user.postalCode ?? "",
    cityName: user.city ?? "",
    stateName: user.state ?? "",
    countryName: user.country ?? "",
  };
}

function requestErrorMessage(error: unknown): string {
  if (error instanceof SocialGraphApiError && error.key === "VERSION_CONFLICT") {
    return "Os dados da conta mudaram em outra sessão. Recarregue as informações antes de salvar.";
  }
  return error instanceof Error ? error.message : "Não foi possível salvar os dados da conta.";
}

export default function SettingsAccount() {
  const shouldReduceMotion = useReducedMotion();
  const { currentUser, updateAccount } = useAppContext();
  const {
    users,
    updateUser,
    upsertRemoteUser,
    isRemoteSocialSession,
  } = useSocial();
  const { toast } = useToast();

  const [remoteProfile, setRemoteProfile] = useState<MyAccountResponse | null>(null);
  const [draft, setDraft] = useState<AccountDraft>(() => draftFromUser(currentUser));
  const [username, setUsername] = useState(currentUser?.username ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isRemoteSocialSession);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [retryLoad, setRetryLoad] = useState(0);

  useEffect(() => {
    if (!isRemoteSocialSession) {
      setRemoteProfile(null);
      setDraft(draftFromUser(currentUser));
      setUsername(currentUser?.username ?? "");
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    if (!currentUser) return;
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    void socialGraphApi.getMyAccount()
      .then((profile) => {
        if (!active) return;
        const user = myAccountToUser(profile);
        setRemoteProfile(profile);
        setDraft(draftFromUser(user));
        setUsername(profile.account.username);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(requestErrorMessage(error));
          setRemoteProfile(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isRemoteSocialSession, retryLoad]);

  const accountType = remoteProfile?.account.accountType ?? currentUser?.accountType;
  const isCommercial = accountType === "commercial";
  const email = remoteProfile?.email ?? currentUser?.email ?? "";
  const currentUsername = remoteProfile?.account.username ?? currentUser?.username ?? "";

  function changeDraft<K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setProfileError(null);
  }

  function syncUpdatedUser(user: User) {
    updateAccount(user);
    updateUser(user);
    if (isRemoteSocialSession) upsertRemoteUser(user);
    setDraft(draftFromUser(user));
    setUsername(user.username);
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !accountType) return;
    const displayName = isCommercial
      ? draft.businessName.trim()
      : `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();

    if (
      (isCommercial
        ? draft.businessName.trim().length < 2
        : draft.firstName.trim().length < 2 || draft.lastName.trim().length < 2)
    ) {
      setProfileError(isCommercial
        ? "Informe um nome comercial válido."
        : "Informe nome e sobrenome válidos.");
      return;
    }
    if (displayName.length > 100) {
      setProfileError("O nome público não pode ultrapassar 100 caracteres.");
      return;
    }
    if (isCommercial && [
      draft.address,
      draft.postalCode,
      draft.cityName,
      draft.stateName,
      draft.countryName,
    ].some((value) => value.trim().length < 2)) {
      setProfileError("Preencha endereço, CEP, cidade, estado e país.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      if (isRemoteSocialSession) {
        if (!remoteProfile) {
          setProfileError("Recarregue os dados da conta antes de salvar.");
          return;
        }
        const updatedProfile = await socialGraphApi.updateMyAccount(isCommercial
          ? {
              displayName,
              commercialProfile: {
                address: draft.address.trim(),
                postalCode: draft.postalCode.trim(),
                cityName: draft.cityName.trim(),
                stateName: draft.stateName.trim(),
                countryName: draft.countryName.trim(),
              },
              version: remoteProfile.account.version,
            }
          : {
              firstName: draft.firstName.trim(),
              lastName: draft.lastName.trim(),
              version: remoteProfile.account.version,
            });
        setRemoteProfile(updatedProfile);
        syncUpdatedUser(myAccountToUser(updatedProfile));
        toast({ title: "Dados da conta atualizados", description: "As alterações foram salvas na sua conta." });
        return;
      }

      const updatedUser: User = isCommercial
        ? {
            ...currentUser,
            displayName,
            address: draft.address.trim(),
            postalCode: draft.postalCode.trim(),
            city: draft.cityName.trim(),
            state: draft.stateName.trim(),
            country: draft.countryName.trim(),
            location: `${draft.cityName.trim()}, ${draft.stateName.trim()}`,
            commercialProfile: currentUser.commercialProfile
              ? {
                  ...currentUser.commercialProfile,
                  address: draft.address.trim(),
                  cityName: draft.cityName.trim(),
                  cityState: draft.stateName.trim(),
                }
              : currentUser.commercialProfile,
          }
        : {
            ...currentUser,
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim(),
            displayName,
          };
      syncUpdatedUser(updatedUser);
      toast({ title: "Dados da demonstração atualizados", description: "A alteração fica neste navegador." });
    } catch (error) {
      const message = requestErrorMessage(error);
      setProfileError(message);
      toast({ title: "Dados não salvos", description: message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function submitUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !accountType) return;
    const nextUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!USERNAME_RE.test(nextUsername)) {
      setUsernameError("Use de 3 a 20 caracteres: letras minúsculas, números ou _.");
      return;
    }
    if (nextUsername === currentUsername) {
      setUsernameError("Esse já é o seu nome de usuário.");
      return;
    }
    if (!isRemoteSocialSession && users.some(
      (user) => user.id !== currentUser.id && user.username.toLowerCase() === nextUsername,
    )) {
      setUsernameError("Esse nome de usuário já está em uso na demonstração.");
      return;
    }

    setIsSavingUsername(true);
    setUsernameError(null);
    try {
      if (isRemoteSocialSession) {
        if (!remoteProfile) {
          setUsernameError("Recarregue os dados da conta antes de salvar.");
          return;
        }
        const updatedProfile = await socialGraphApi.updateMyAccount({
          username: nextUsername,
          version: remoteProfile.account.version,
        });
        setRemoteProfile(updatedProfile);
        syncUpdatedUser(myAccountToUser(updatedProfile));
      } else {
        syncUpdatedUser({ ...currentUser, username: nextUsername });
      }
      toast({
        title: "Nome de usuário alterado",
        description: isRemoteSocialSession
          ? `Agora sua conta é @${nextUsername}.`
          : `Agora a demonstração é @${nextUsername} neste navegador.`,
      });
    } catch (error) {
      const message = requestErrorMessage(error);
      setUsernameError(message);
      toast({ title: "Nome de usuário não alterado", description: message, variant: "destructive" });
    } finally {
      setIsSavingUsername(false);
    }
  }

  function handleEmailChanged(nextEmail: string) {
    setRemoteProfile((profile) => profile ? { ...profile, email: nextEmail } : profile);
    if (!currentUser) return;
    const updatedUser = { ...currentUser, email: nextEmail };
    updateAccount(updatedUser);
    updateUser(updatedUser);
    upsertRemoteUser(updatedUser);
  }

  const disabled = isLoading || Boolean(loadError) || isSavingProfile || isSavingUsername;
  const disabledField = "h-12 bg-card border-border rounded-xl";

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Conta" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        className="pb-8"
      >
        {isLoading && (
          <p role="status" className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando dados da conta…
          </p>
        )}
        {loadError && (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11"
              onClick={() => setRetryLoad((value) => value + 1)}
            >
              <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Recarregar dados
            </Button>
          </div>
        )}

        {accountType && !isLoading && !loadError && (
          <>
            <SectionTitle>{isCommercial ? "Dados comerciais" : "Dados pessoais"}</SectionTitle>
            <form onSubmit={(event) => void submitProfile(event)} className="px-4 pt-2">
              <fieldset disabled={disabled} className="min-w-0 space-y-3">
              {isCommercial ? (
                <>
                  <Input
                    value={draft.businessName}
                    onChange={(event) => changeDraft("businessName", event.target.value)}
                    aria-label="Nome da empresa ou prestador de serviço"
                    autoComplete="organization"
                    maxLength={100}
                    required
                    placeholder="Nome da empresa ou prestador de serviço"
                    className={disabledField}
                  />
                  <Input
                    value={draft.address}
                    onChange={(event) => changeDraft("address", event.target.value)}
                    aria-label="Endereço comercial"
                    autoComplete="street-address"
                    maxLength={250}
                    required
                    placeholder="Endereço"
                    className={disabledField}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      value={draft.postalCode}
                      onChange={(event) => changeDraft("postalCode", event.target.value)}
                      aria-label="CEP"
                      autoComplete="postal-code"
                      minLength={5}
                      maxLength={20}
                      required
                      placeholder="CEP"
                      className={disabledField}
                    />
                    <Input
                      value={draft.cityName}
                      onChange={(event) => changeDraft("cityName", event.target.value)}
                      aria-label="Cidade"
                      autoComplete="address-level2"
                      maxLength={120}
                      required
                      placeholder="Cidade"
                      className={disabledField}
                    />
                    <Input
                      value={draft.stateName}
                      onChange={(event) => changeDraft("stateName", event.target.value)}
                      aria-label="Estado"
                      autoComplete="address-level1"
                      maxLength={100}
                      required
                      placeholder="Estado"
                      className={disabledField}
                    />
                    <Input
                      value={draft.countryName}
                      onChange={(event) => changeDraft("countryName", event.target.value)}
                      aria-label="País"
                      autoComplete="country-name"
                      maxLength={100}
                      required
                      placeholder="País"
                      className={disabledField}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Input
                    value={draft.firstName}
                    onChange={(event) => changeDraft("firstName", event.target.value)}
                    aria-label="Nome"
                    autoComplete="given-name"
                    maxLength={80}
                    required
                    placeholder="Nome"
                    className={disabledField}
                  />
                  <Input
                    value={draft.lastName}
                    onChange={(event) => changeDraft("lastName", event.target.value)}
                    aria-label="Sobrenome"
                    autoComplete="family-name"
                    maxLength={80}
                    required
                    placeholder="Sobrenome"
                    className={disabledField}
                  />
                </>
              )}

              <Input
                value={email}
                readOnly
                type="email"
                aria-label="E-mail verificado da conta"
                autoComplete="email"
                placeholder="E-mail verificado"
                className={`${disabledField} opacity-70`}
              />
              <p className="text-xs text-muted-foreground">Para alterar o e-mail, use o fluxo de confirmação abaixo.</p>
              {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
              <Button
                type="submit"
                className="min-h-11 rounded-xl px-6"
                disabled={disabled}
                data-testid="button-save-profile"
              >
                {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Salvar dados da conta
              </Button>
              </fieldset>
            </form>

            <SectionTitle>Nome de usuário</SectionTitle>
            <form onSubmit={(event) => void submitUsername(event)} className="px-4 pt-2" noValidate>
              <fieldset disabled={disabled} className="min-w-0 space-y-3">
              <p className="text-xs text-muted-foreground">
                Atual: <span className="font-semibold text-foreground">@{currentUsername}</span>. O nome é único na plataforma.
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" aria-hidden>@</span>
                <Input
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setUsernameError(null);
                  }}
                  placeholder="novo_usuario"
                  aria-label="Novo nome de usuário"
                  aria-invalid={Boolean(usernameError)}
                  aria-describedby={usernameError ? "username-error" : undefined}
                  autoCapitalize="none"
                  autoComplete="username"
                  maxLength={20}
                  data-testid="input-new-username"
                  className={`${disabledField} pl-8`}
                />
              </div>
              {usernameError && <p id="username-error" role="alert" className="text-sm text-destructive">{usernameError}</p>}
              <Button
                type="submit"
                className="min-h-11 rounded-xl px-6"
                disabled={disabled || !username.trim()}
                data-testid="button-update-username"
              >
                {isSavingUsername && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Atualizar nome de usuário
              </Button>
              </fieldset>
            </form>

            <SectionTitle>E-mail e senha</SectionTitle>
            {!isRemoteSocialSession ? (
              <UnavailableNotice>
                A demonstração deste navegador não altera credenciais. A troca de e-mail e senha exige uma conta autenticada pela API.
              </UnavailableNotice>
            ) : (
              <div className="space-y-5 px-4 pt-2">
                <AccountEmailChange fieldClassName={disabledField} onEmailChanged={handleEmailChanged} />

                <AccountPasswordChange email={email} fieldClassName={disabledField} />

                <p className="text-xs text-muted-foreground">
                  Sem acesso ao e-mail atual? Solicite ajuda ao suporte:{" "}
                  <a className="underline underline-offset-2" href="mailto:admseekalive@gmail.com">admseekalive@gmail.com</a>.
                </p>
              </div>
            )}

            <SectionTitle>Contas conectadas</SectionTitle>
            <div className="px-4 pt-2 space-y-2">
              {["Google", "Apple"].map((provider) => (
                <div key={provider} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <span className="text-sm font-medium">{provider}</span>
                  <Button disabled variant="outline" size="sm" className="min-h-10 rounded-full text-xs" data-testid={`button-connect-${provider.toLowerCase()}`}>
                    Indisponível
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-4 pt-6">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-destructive">Zona de perigo</h2>
            </div>
            <UnavailableNotice>Desativar ou excluir a conta ainda não está disponível. Nenhum dado será alterado por estes controles.</UnavailableNotice>
            <div className="space-y-2 px-4 pt-3">
              <Button disabled variant="outline" className="min-h-11 w-full rounded-xl border-destructive/40 text-destructive" data-testid="button-deactivate">
                Desativar conta
              </Button>
              <Button disabled variant="destructive" className="min-h-11 w-full rounded-xl" data-testid="button-delete">
                Excluir conta permanentemente
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
