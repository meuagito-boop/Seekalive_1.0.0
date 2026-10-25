import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";
import type { User } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { accountPasswordChangeRequestSchema } from "@workspace/api-zod";
import {
  confirmAccountPasswordChange,
  confirmCurrentAccountEmailChange,
  confirmNewAccountEmailChange,
  requestAccountEmailChange,
  requestAccountPasswordChange,
} from "@/services/authApi";
import { myAccountToUser, socialGraphApi, SocialGraphApiError } from "@/services/socialGraphApi";
import type { MyAccountResponse } from "@workspace/api-client-react";
import { useLocation } from "wouter";
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
  const { currentUser, updateAccount, logout } = useAppContext();
  const [, setLocation] = useLocation();
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
  const [emailChangeStep, setEmailChangeStep] = useState<"idle" | "confirm-current" | "confirm-new">("idle");
  const [emailChangeChallengeId, setEmailChangeChallengeId] = useState("");
  const [emailChangeCurrentMasked, setEmailChangeCurrentMasked] = useState("");
  const [emailChangeNewMasked, setEmailChangeNewMasked] = useState("");
  const [emailChangeExpiresAt, setEmailChangeExpiresAt] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailChangeNewEmail, setEmailChangeNewEmail] = useState("");
  const [emailChangeCode, setEmailChangeCode] = useState("");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [passwordChangeChallengeId, setPasswordChangeChallengeId] = useState("");
  const [passwordChangeEmailMasked, setPasswordChangeEmailMasked] = useState("");
  const [passwordChangeExpiresAt, setPasswordChangeExpiresAt] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordChangeCode, setPasswordChangeCode] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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

  function resetEmailChange() {
    setEmailChangeStep("idle");
    setEmailChangeChallengeId("");
    setEmailChangeCurrentMasked("");
    setEmailChangeNewMasked("");
    setEmailChangeExpiresAt("");
    setEmailChangePassword("");
    setEmailChangeNewEmail("");
    setEmailChangeCode("");
    setEmailChangeError(null);
  }

  async function submitEmailChangeRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isRemoteSocialSession) return;
    setIsChangingEmail(true);
    setEmailChangeError(null);
    try {
      const result = await requestAccountEmailChange({
        currentPassword: emailChangePassword,
        newEmail: emailChangeNewEmail,
      });
      setEmailChangeChallengeId(result.challengeId);
      setEmailChangeCurrentMasked(result.currentEmailMasked ?? "");
      setEmailChangeNewMasked(result.newEmailMasked ?? "");
      setEmailChangeExpiresAt(result.expiresAt);
      setEmailChangePassword("");
      setEmailChangeNewEmail("");
      setEmailChangeCode("");
      setEmailChangeStep("confirm-current");
      toast({ title: "Código enviado", description: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível iniciar a troca de e-mail.";
      setEmailChangeError(message);
    } finally {
      setIsChangingEmail(false);
    }
  }

  async function submitCurrentEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailChangeChallengeId) return;
    setIsChangingEmail(true);
    setEmailChangeError(null);
    try {
      const result = await confirmCurrentAccountEmailChange({
        challengeId: emailChangeChallengeId,
        code: emailChangeCode,
      });
      setEmailChangeChallengeId(result.challengeId);
      setEmailChangeNewMasked(result.newEmailMasked ?? emailChangeNewMasked);
      setEmailChangeExpiresAt(result.expiresAt);
      setEmailChangeCode("");
      setEmailChangeStep("confirm-new");
      toast({ title: "E-mail atual confirmado", description: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível confirmar o código.";
      setEmailChangeError(message);
    } finally {
      setIsChangingEmail(false);
    }
  }

  async function submitNewEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailChangeChallengeId) return;
    setIsChangingEmail(true);
    setEmailChangeError(null);
    try {
      const result = await confirmNewAccountEmailChange({
        challengeId: emailChangeChallengeId,
        code: emailChangeCode,
      });
      setRemoteProfile((profile) => profile ? { ...profile, email: result.email } : profile);
      if (currentUser) {
        const updatedUser = { ...currentUser, email: result.email };
        updateAccount(updatedUser);
        updateUser(updatedUser);
        upsertRemoteUser(updatedUser);
      }
      resetEmailChange();
      toast({
        title: "E-mail alterado",
        description: result.securityNoticeSent
          ? "O novo endereço foi confirmado. Enviamos um aviso ao e-mail anterior."
          : "O novo endereço foi confirmado, mas não foi possível enviar o aviso ao e-mail anterior.",
        ...(result.securityNoticeSent ? {} : { variant: "destructive" as const }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível confirmar o novo e-mail.";
      setEmailChangeError(message);
    } finally {
      setIsChangingEmail(false);
    }
  }

  function resetPasswordChange() {
    setPasswordChangeChallengeId("");
    setPasswordChangeEmailMasked("");
    setPasswordChangeExpiresAt("");
    setPasswordCurrent("");
    setPasswordNew("");
    setPasswordConfirmation("");
    setPasswordChangeCode("");
    setPasswordChangeError(null);
  }

  async function submitPasswordChangeRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isRemoteSocialSession) return;
    const validation = accountPasswordChangeRequestSchema.safeParse({
      currentPassword: passwordCurrent,
      newPassword: passwordNew,
      passwordConfirmation,
    });
    if (!validation.success) {
      setPasswordChangeError(validation.error.issues[0]?.message ?? "Confira os dados da nova senha.");
      return;
    }
    setIsChangingPassword(true);
    setPasswordChangeError(null);
    try {
      const result = await requestAccountPasswordChange({
        currentPassword: passwordCurrent,
        newPassword: passwordNew,
        passwordConfirmation,
      });
      setPasswordChangeChallengeId(result.challengeId);
      setPasswordChangeEmailMasked(result.emailMasked ?? "");
      setPasswordChangeExpiresAt(result.expiresAt);
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirmation("");
      setPasswordChangeCode("");
      toast({ title: "Código enviado", description: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível iniciar a troca de senha.";
      setPasswordChangeError(message);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function submitPasswordChangeCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordChangeChallengeId) return;
    setIsChangingPassword(true);
    setPasswordChangeError(null);
    try {
      await confirmAccountPasswordChange({
        challengeId: passwordChangeChallengeId,
        code: passwordChangeCode,
      });
      resetPasswordChange();
      toast({
        title: "Senha alterada",
        description: "Por segurança, todas as sessões foram encerradas. Entre novamente com a nova senha.",
      });
      await logout();
      setLocation("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível confirmar a troca de senha.";
      setPasswordChangeError(message);
    } finally {
      setIsChangingPassword(false);
    }
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
                <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-labelledby="email-change-title">
                  <div>
                    <h3 id="email-change-title" className="text-base font-semibold">Trocar e-mail</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O endereço atual continua ativo até você confirmar o código enviado ao novo e-mail.
                    </p>
                  </div>
                  {emailChangeStep === "idle" ? (
                    <form onSubmit={(event) => void submitEmailChangeRequest(event)} className="space-y-3">
                      <Input
                        type="email"
                        value={emailChangeNewEmail}
                        onChange={(event) => setEmailChangeNewEmail(event.target.value)}
                        aria-label="Novo endereço de e-mail"
                        aria-invalid={Boolean(emailChangeError)}
                        aria-describedby={emailChangeError ? "email-change-error" : undefined}
                        autoComplete="email"
                        maxLength={254}
                        required
                        placeholder="Novo e-mail"
                        className={disabledField}
                        disabled={isChangingEmail}
                      />
                      <Input
                        type="password"
                        value={emailChangePassword}
                        onChange={(event) => setEmailChangePassword(event.target.value)}
                        aria-label="Senha atual para autorizar a troca de e-mail"
                        aria-invalid={Boolean(emailChangeError)}
                        aria-describedby={emailChangeError ? "email-change-error" : undefined}
                        autoComplete="current-password"
                        maxLength={128}
                        required
                        placeholder="Senha atual"
                        className={disabledField}
                        disabled={isChangingEmail}
                      />
                      <Button type="submit" className="min-h-11 rounded-xl" disabled={isChangingEmail}>
                        {isChangingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                        Enviar código ao e-mail atual
                      </Button>
                    </form>
                  ) : (
                    <form
                      onSubmit={(event) => void (emailChangeStep === "confirm-current"
                        ? submitCurrentEmailCode(event)
                        : submitNewEmailCode(event))}
                      className="space-y-3"
                    >
                      <p className="text-sm text-muted-foreground">
                        {emailChangeStep === "confirm-current"
                          ? `Digite o código enviado ao e-mail atual ${emailChangeCurrentMasked}.`
                          : `Digite o código enviado ao novo endereço ${emailChangeNewMasked}.`}
                        {" "}O código expira às {new Date(emailChangeExpiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
                      </p>
                      <Input
                        value={emailChangeCode}
                        onChange={(event) => setEmailChangeCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
                        aria-label="Código de confirmação do e-mail"
                        aria-invalid={Boolean(emailChangeError)}
                        aria-describedby={emailChangeError ? "email-change-error" : undefined}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        minLength={6}
                        required
                        placeholder="Código de 6 dígitos"
                        className={disabledField}
                        disabled={isChangingEmail}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" className="min-h-11 rounded-xl" disabled={isChangingEmail || emailChangeCode.length !== 6}>
                          {isChangingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                          {emailChangeStep === "confirm-current" ? "Confirmar e enviar ao novo e-mail" : "Confirmar novo e-mail"}
                        </Button>
                        <Button type="button" variant="outline" className="min-h-11 rounded-xl" disabled={isChangingEmail} onClick={resetEmailChange}>
                          Iniciar novamente
                        </Button>
                      </div>
                    </form>
                  )}
                  {emailChangeError && <p id="email-change-error" role="alert" className="text-sm text-destructive">{emailChangeError}</p>}
                </section>

                <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-labelledby="password-change-title">
                  <div>
                    <h3 id="password-change-title" className="text-base font-semibold">Trocar senha</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Você precisará da senha atual e de um código enviado a {email}.
                      Após a confirmação, todas as sessões e instalações reconhecidas serão revogadas.
                    </p>
                  </div>
                  {!passwordChangeChallengeId ? (
                    <form onSubmit={(event) => void submitPasswordChangeRequest(event)} className="space-y-3">
                      <Input
                        type="password"
                        value={passwordCurrent}
                        onChange={(event) => setPasswordCurrent(event.target.value)}
                        aria-label="Senha atual"
                        aria-invalid={Boolean(passwordChangeError)}
                        aria-describedby={passwordChangeError ? "password-change-error" : undefined}
                        autoComplete="current-password"
                        maxLength={128}
                        required
                        placeholder="Senha atual"
                        className={disabledField}
                        disabled={isChangingPassword}
                      />
                      <Input
                        type="password"
                        value={passwordNew}
                        onChange={(event) => setPasswordNew(event.target.value)}
                        aria-label="Nova senha"
                        aria-invalid={Boolean(passwordChangeError)}
                        aria-describedby={passwordChangeError ? "password-change-error" : undefined}
                        autoComplete="new-password"
                        maxLength={128}
                        required
                        placeholder="Nova senha"
                        className={disabledField}
                        disabled={isChangingPassword}
                      />
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.
                      </p>
                      <Input
                        type="password"
                        value={passwordConfirmation}
                        onChange={(event) => setPasswordConfirmation(event.target.value)}
                        aria-label="Confirme a nova senha"
                        aria-invalid={Boolean(passwordChangeError)}
                        aria-describedby={passwordChangeError ? "password-change-error" : undefined}
                        autoComplete="new-password"
                        maxLength={128}
                        required
                        placeholder="Confirme a nova senha"
                        className={disabledField}
                        disabled={isChangingPassword}
                      />
                      <Button type="submit" className="min-h-11 rounded-xl" disabled={isChangingPassword}>
                        {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                        Enviar código ao e-mail atual
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={(event) => void submitPasswordChangeCode(event)} className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Digite o código enviado a {passwordChangeEmailMasked}. Ele expira às{" "}
                        {new Date(passwordChangeExpiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
                      </p>
                      <Input
                        value={passwordChangeCode}
                        onChange={(event) => setPasswordChangeCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
                        aria-label="Código para confirmar a troca de senha"
                        aria-invalid={Boolean(passwordChangeError)}
                        aria-describedby={passwordChangeError ? "password-change-error" : undefined}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        minLength={6}
                        required
                        placeholder="Código de 6 dígitos"
                        className={disabledField}
                        disabled={isChangingPassword}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" className="min-h-11 rounded-xl" disabled={isChangingPassword || passwordChangeCode.length !== 6}>
                          {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                          Confirmar troca e encerrar sessões
                        </Button>
                        <Button type="button" variant="outline" className="min-h-11 rounded-xl" disabled={isChangingPassword} onClick={resetPasswordChange}>
                          Iniciar novamente
                        </Button>
                      </div>
                    </form>
                  )}
                  {passwordChangeError && <p id="password-change-error" role="alert" className="text-sm text-destructive">{passwordChangeError}</p>}
                </section>

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
