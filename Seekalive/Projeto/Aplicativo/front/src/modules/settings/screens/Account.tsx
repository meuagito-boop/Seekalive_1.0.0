import { useReducedMotion, motion } from "framer-motion";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useAccountProfileSettings } from "@/modules/settings/hooks/useAccountProfileSettings";
import { useUsernameSettings } from "@/modules/settings/hooks/useUsernameSettings";
import { SettingsSubheader, SectionTitle, UnavailableNotice } from "./SettingsSubheader";
import { EmailChangeForm } from "../components/account/EmailChangeForm";
import { PasswordChangeForm } from "../components/account/PasswordChangeForm";
import { PersonalAccountForm } from "../components/account/PersonalAccountForm";
import { CommercialAccountForm } from "../components/account/CommercialAccountForm";
import { UsernameForm } from "../components/account/UsernameForm";

export default function SettingsAccount() {
  const shouldReduceMotion = useReducedMotion();
  const { clearLocalAuthentication } = useAppContext();
  const [, setLocation] = useLocation();
  const profile = useAccountProfileSettings();
  const username = useUsernameSettings({
    accountType: profile.accountType,
    currentUsername: profile.currentUsername,
    isRemoteSocialSession: profile.isRemoteSocialSession,
    remoteProfile: profile.remoteProfile,
    setRemoteProfile: profile.setRemoteProfile,
    syncUpdatedUser: profile.syncUpdatedUser,
  });

  const disabled = profile.isLoading
    || Boolean(profile.loadError)
    || profile.isSavingProfile
    || username.isSavingUsername;
  const disabledField = "h-12 bg-card border-border rounded-xl";

  function handlePasswordChanged() {
    clearLocalAuthentication();
    setLocation("/login");
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Conta" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        className="pb-8"
      >
        {profile.isLoading && (
          <p role="status" className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando dados da conta…
          </p>
        )}
        {profile.loadError && (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{profile.loadError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11"
              onClick={profile.retry}
            >
              <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Recarregar dados
            </Button>
          </div>
        )}

        {profile.accountType && !profile.isLoading && !profile.loadError && (
          <>
            {profile.isCommercial ? (
              <CommercialAccountForm
                draft={profile.draft}
                email={profile.email}
                error={profile.profileError}
                isDisabled={disabled}
                isSaving={profile.isSavingProfile}
                disabledField={disabledField}
                onChange={(key, value) => profile.changeDraft(key, value)}
                onSubmit={(event) => void profile.submitProfile(event)}
              />
            ) : (
              <PersonalAccountForm
                draft={profile.draft}
                email={profile.email}
                error={profile.profileError}
                isDisabled={disabled}
                isSaving={profile.isSavingProfile}
                disabledField={disabledField}
                onChange={(key, value) => profile.changeDraft(key, value)}
                onSubmit={(event) => void profile.submitProfile(event)}
              />
            )}

            <UsernameForm
              username={username.username}
              currentUsername={profile.currentUsername}
              error={username.usernameError}
              isDisabled={disabled}
              isSaving={username.isSavingUsername}
              disabledField={disabledField}
              onChange={(value) => {
                username.setUsername(value);
                username.setUsernameError(null);
              }}
              onSubmit={(event) => void username.submitUsername(event)}
            />

            <SectionTitle>E-mail e senha</SectionTitle>
            {!profile.isRemoteSocialSession ? (
              <UnavailableNotice>
                A demonstração deste navegador não altera credenciais. A troca de e-mail e senha exige uma conta autenticada pela API.
              </UnavailableNotice>
            ) : (
              <div className="space-y-5 px-4 pt-2">
                <EmailChangeForm
                  email={profile.email}
                  disabledField={disabledField}
                  onEmailChanged={profile.handleEmailChanged}
                />
                <PasswordChangeForm
                  email={profile.email}
                  disabledField={disabledField}
                  onPasswordChanged={handlePasswordChanged}
                />
                <p className="text-xs text-muted-foreground">
                  Sem acesso ao e-mail atual? Solicite ajuda ao suporte:{" "}
                  <a className="underline underline-offset-2" href="mailto:admseekalive@gmail.com">
                    admseekalive@gmail.com
                  </a>.
                </p>
              </div>
            )}

            <SectionTitle>Contas conectadas</SectionTitle>
            <div className="space-y-2 px-4 pt-2">
              {["Google", "Apple"].map((provider) => (
                <div key={provider} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
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
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-destructive">Zona de perigo</h2>
            </div>
            <UnavailableNotice>
              Desativar ou excluir a conta ainda não está disponível. Nenhum dado será alterado por estes controles.
            </UnavailableNotice>
            <div className="space-y-2 px-4 pt-3">
              <Button
                disabled
                variant="outline"
                className="min-h-11 w-full rounded-xl border-destructive/40 text-destructive"
                data-testid="button-deactivate"
              >
                Desativar conta
              </Button>
              <Button
                disabled
                variant="destructive"
                className="min-h-11 w-full rounded-xl"
                data-testid="button-delete"
              >
                Excluir conta permanentemente
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
