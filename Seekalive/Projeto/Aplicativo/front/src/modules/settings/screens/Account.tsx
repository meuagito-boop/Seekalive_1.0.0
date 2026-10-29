import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import type { User } from "@/modules/profile/types/user";
import { useToast } from "@/hooks/use-toast";
import {
  myAccountToUser,
  socialGraphApi,
  SocialGraphApiError,
} from "@/modules/social/services/socialGraphApi";
import type { MyAccountResponse } from "@workspace/api-client-react";
import { accountDraftFromUser } from "@/modules/settings/application/accountDraft";
import { AccountEmailChange } from "@/modules/settings/components/account/AccountEmailChange";
import { AccountProfileForm } from "@/modules/settings/components/account/AccountProfileForm";
import { AccountPasswordChange } from "@/modules/settings/components/account/AccountPasswordChange";
import { AccountUsernameForm } from "@/modules/settings/components/account/AccountUsernameForm";
import {
  SectionTitle,
  SettingsSubheader,
  UnavailableNotice,
} from "@/modules/settings/components/SettingsSubheader";
import { AccountDeletionControls } from "@/modules/settings/components/account/AccountDeletionControls";
import type { AccountDraft } from "@/modules/settings/types/accountSettings";
import { useLocation } from "wouter";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function requestErrorMessage(error: unknown): string {
  if (
    error instanceof SocialGraphApiError &&
    error.key === "VERSION_CONFLICT"
  ) {
    return "Os dados da conta mudaram em outra sessão. Recarregue as informações antes de salvar.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível salvar os dados da conta.";
}

export default function SettingsAccount() {
  const shouldReduceMotion = useReducedMotion();
  const { currentUser, updateAccount, clearLocalAuthentication } =
    useAppContext();
  const [, setLocation] = useLocation();
  const { users, updateUser, upsertRemoteUser, isRemoteSocialSession } =
    useSocial();
  const { toast } = useToast();

  function handleAccountDeletionScheduled(deletionScheduledFor: string) {
    const date = new Date(deletionScheduledFor).toLocaleString("pt-BR");
    clearLocalAuthentication();
    toast({
      title: "Exclusão solicitada",
      description: `A conta foi desativada e ficará oculta. A exclusão definitiva está agendada para ${date}.`,
    });
    setLocation("/login");
  }

  const [remoteProfile, setRemoteProfile] = useState<MyAccountResponse | null>(
    null,
  );
  const [draft, setDraft] = useState<AccountDraft>(() =>
    accountDraftFromUser(currentUser),
  );
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
      setDraft(accountDraftFromUser(currentUser));
      setUsername(currentUser?.username ?? "");
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    if (!currentUser) return;
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    void socialGraphApi
      .getMyAccount()
      .then((profile) => {
        if (!active) return;
        const user = myAccountToUser(profile);
        setRemoteProfile(profile);
        setDraft(accountDraftFromUser(user));
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

  const accountType =
    remoteProfile?.account.accountType ?? currentUser?.accountType;
  const isCommercial = accountType === "commercial";
  const email = remoteProfile?.email ?? currentUser?.email ?? "";
  const currentUsername =
    remoteProfile?.account.username ?? currentUser?.username ?? "";

  function changeDraft<K extends keyof AccountDraft>(
    key: K,
    value: AccountDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setProfileError(null);
  }

  function syncUpdatedUser(user: User) {
    updateAccount(user);
    updateUser(user);
    if (isRemoteSocialSession) upsertRemoteUser(user);
    setDraft(accountDraftFromUser(user));
    setUsername(user.username);
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !accountType) return;
    const displayName = isCommercial
      ? draft.businessName.trim()
      : `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();

    if (
      isCommercial
        ? draft.businessName.trim().length < 2
        : draft.firstName.trim().length < 2 || draft.lastName.trim().length < 2
    ) {
      setProfileError(
        isCommercial
          ? "Informe um nome comercial válido."
          : "Informe nome e sobrenome válidos.",
      );
      return;
    }
    if (displayName.length > 100) {
      setProfileError("O nome público não pode ultrapassar 100 caracteres.");
      return;
    }
    if (
      isCommercial &&
      [
        draft.address,
        draft.postalCode,
        draft.cityName,
        draft.stateName,
        draft.countryName,
      ].some((value) => value.trim().length < 2)
    ) {
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
        const updatedProfile = await socialGraphApi.updateMyAccount(
          isCommercial
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
              },
        );
        setRemoteProfile(updatedProfile);
        syncUpdatedUser(myAccountToUser(updatedProfile));
        toast({
          title: "Dados da conta atualizados",
          description: "As alterações foram salvas na sua conta.",
        });
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
      toast({
        title: "Dados da demonstração atualizados",
        description: "A alteração fica neste navegador.",
      });
    } catch (error) {
      const message = requestErrorMessage(error);
      setProfileError(message);
      toast({
        title: "Dados não salvos",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function submitUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !accountType) return;
    const nextUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!USERNAME_RE.test(nextUsername)) {
      setUsernameError(
        "Use de 3 a 20 caracteres: letras minúsculas, números ou _.",
      );
      return;
    }
    if (nextUsername === currentUsername) {
      setUsernameError("Esse já é o seu nome de usuário.");
      return;
    }
    if (
      !isRemoteSocialSession &&
      users.some(
        (user) =>
          user.id !== currentUser.id &&
          user.username.toLowerCase() === nextUsername,
      )
    ) {
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
      toast({
        title: "Nome de usuário não alterado",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingUsername(false);
    }
  }

  function handleEmailChanged(nextEmail: string) {
    setRemoteProfile((profile) =>
      profile ? { ...profile, email: nextEmail } : profile,
    );
    if (!currentUser) return;
    const updatedUser = { ...currentUser, email: nextEmail };
    updateAccount(updatedUser);
    updateUser(updatedUser);
    upsertRemoteUser(updatedUser);
  }

  const disabled =
    isLoading || Boolean(loadError) || isSavingProfile || isSavingUsername;
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
          <p
            role="status"
            className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando dados da conta…
          </p>
        )}
        {loadError && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
          >
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
            <AccountProfileForm
              isCommercial={isCommercial}
              draft={draft}
              email={email}
              disabled={disabled}
              disabledField={disabledField}
              profileError={profileError}
              isSaving={isSavingProfile}
              onDraftChange={changeDraft}
              onSubmit={(event) => void submitProfile(event)}
            />

            <AccountUsernameForm
              currentUsername={currentUsername}
              username={username}
              disabled={disabled}
              disabledField={disabledField}
              usernameError={usernameError}
              isSaving={isSavingUsername}
              onUsernameChange={(value) => {
                setUsername(value);
                setUsernameError(null);
              }}
              onSubmit={(event) => void submitUsername(event)}
            />

            <SectionTitle>E-mail e senha</SectionTitle>
            {!isRemoteSocialSession ? (
              <UnavailableNotice>
                A demonstração deste navegador não altera credenciais. A troca
                de e-mail e senha exige uma conta autenticada pela API.
              </UnavailableNotice>
            ) : (
              <div className="space-y-5 px-4 pt-2">
                <AccountEmailChange
                  fieldClassName={disabledField}
                  onEmailChanged={handleEmailChanged}
                />

                <AccountPasswordChange
                  email={email}
                  fieldClassName={disabledField}
                />

                <p className="text-xs text-muted-foreground">
                  Sem acesso ao e-mail atual? Solicite ajuda ao suporte:{" "}
                  <a
                    className="underline underline-offset-2"
                    href="mailto:admseekalive@gmail.com"
                  >
                    admseekalive@gmail.com
                  </a>
                  .
                </p>
              </div>
            )}

            <SectionTitle>Contas conectadas</SectionTitle>
            <div className="px-4 pt-2 space-y-2">
              {["Google", "Apple"].map((provider) => (
                <div
                  key={provider}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                >
                  <span className="text-sm font-medium">{provider}</span>
                  <Button
                    disabled
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-full text-xs"
                    data-testid={`button-connect-${provider.toLowerCase()}`}
                  >
                    Indisponível
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-4 pt-6">
              <AlertTriangle
                className="h-4 w-4 text-destructive"
                aria-hidden="true"
              />
              <h2 className="text-xs font-bold uppercase tracking-wider text-destructive">
                Zona de perigo
              </h2>
            </div>
            <div className="px-4 pt-3">
              {isRemoteSocialSession ? (
                <AccountDeletionControls
                  onScheduled={handleAccountDeletionScheduled}
                />
              ) : (
                <UnavailableNotice>
                  A solicitação de exclusão exige uma conta autenticada pela
                  API.
                </UnavailableNotice>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
