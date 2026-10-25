import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { UnavailableState } from "@/components/content/StateBlocks";
import { CommercialProfileFields } from "@/modules/profile/commercial-profile/components/CommercialProfileFields";
import { ProfileDetailsFields } from "@/modules/profile/components/ProfileDetailsFields";
import { ProfileEditHeader } from "@/modules/profile/components/ProfileEditHeader";
import { ProfileIdentityFields } from "@/modules/profile/components/ProfileIdentityFields";
import { useProfileEditController } from "@/modules/profile/hooks/useProfileEditController";

export default function ProfileEdit() {
  const {
    accountLoadError,
    currentUser,
    discoveryCity,
    formatChangeDate,
    form,
    goTo,
    hoursError,
    isSaving,
    isServerAccount,
    onSubmit,
    ownerProfile,
    publicNameChangeDate,
    publicNameLocked,
    saveError,
    setDiscoveryCity,
    updateDayHours,
    usernameChangeDate,
    usernameLocked,
    weeklyHours,
  } = useProfileEditController();

  if (!currentUser) {
    return (
      <UnavailableState
        title="Conta indisponível"
        description="Entre na sua conta para editar o perfil."
        action={<Button onClick={() => goTo("/login")} className="rounded-full">Ir para o login</Button>}
      />
    );
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Editar perfil</h1>
        <Button
          type="submit"
          form="edit-form"
          disabled={isSaving || (isServerAccount && !ownerProfile)}
          className="h-8 rounded-full px-5 text-sm font-semibold"
          data-testid="button-save"
        >
          {isSaving ? "Salvando…" : "Salvar"}
        </Button>
      </div>

      <ProfileEditHeader user={currentUser} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <Form {...form}>
          <form id="edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <ProfileIdentityFields
              form={form}
              accountType={currentUser.accountType}
              publicNameLocked={publicNameLocked}
              usernameLocked={usernameLocked}
              publicNameChangeDate={publicNameChangeDate}
              usernameChangeDate={usernameChangeDate}
              formatChangeDate={formatChangeDate}
              accountLoadError={accountLoadError}
              saveError={saveError}
            />
            <ProfileDetailsFields form={form} />
            {currentUser.accountType === "commercial" && (
              <CommercialProfileFields
                form={form}
                discoveryCity={discoveryCity}
                onDiscoveryCityChange={setDiscoveryCity}
                weeklyHours={weeklyHours}
                updateDayHours={updateDayHours}
                hoursError={hoursError}
                isServerAccount={isServerAccount}
              />
            )}
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
