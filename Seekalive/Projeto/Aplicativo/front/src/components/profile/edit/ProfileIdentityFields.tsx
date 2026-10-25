import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ProfileEditFormValues } from "@/pages/profile-edit/profileEditSchema";

type Props = {
  form: UseFormReturn<ProfileEditFormValues>;
  accountType: "personal" | "commercial";
  publicNameLocked: boolean;
  usernameLocked: boolean;
  publicNameChangeDate: Date | null;
  usernameChangeDate: Date | null;
  formatChangeDate: (value: Date | null) => string;
  accountLoadError: string;
  saveError: string;
};

export function ProfileIdentityFields({
  form,
  accountType,
  publicNameLocked,
  usernameLocked,
  publicNameChangeDate,
  usernameChangeDate,
  formatChangeDate,
  accountLoadError,
  saveError,
}: Props) {
  return (
    <>
      {accountType === "personal" ? (
        <>
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Nome</FormLabel>
                <FormControl>
                  <Input {...field} disabled={publicNameLocked} data-testid="input-first-name" className="h-12 rounded-xl border-border bg-card" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Sobrenome</FormLabel>
                <FormControl>
                  <Input {...field} disabled={publicNameLocked} data-testid="input-last-name" className="h-12 rounded-xl border-border bg-card" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ) : (
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Nome da empresa ou estabelecimento</FormLabel>
              <FormControl>
                <Input {...field} disabled={publicNameLocked} data-testid="input-display-name" className="h-12 rounded-xl border-border bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {publicNameLocked && publicNameChangeDate && (
        <p className="text-xs text-muted-foreground" data-testid="name-change-availability">
          O nome público poderá ser alterado novamente em{" "}
          <time dateTime={publicNameChangeDate.toISOString()}>{formatChangeDate(publicNameChangeDate)}</time>.
        </p>
      )}

      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-muted-foreground">Identificador social (@)</FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                <Input {...field} disabled={usernameLocked} data-testid="input-username" className="h-12 rounded-xl border-border bg-card pl-8" />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <p className="text-xs text-muted-foreground">
        O nome identifica a pessoa ou empresa; o @ é exclusivo e identifica a conta. Ao trocar o @, o anterior fica indisponível para todos por 30 dias.
        {usernameLocked && usernameChangeDate && (
          <>
            {" "}Você poderá alterá-lo novamente em{" "}
            <time dateTime={usernameChangeDate.toISOString()}>{formatChangeDate(usernameChangeDate)}</time>.
          </>
        )}
      </p>
      {(accountLoadError || saveError) && (
        <p role="alert" className="text-sm text-destructive">
          {saveError || accountLoadError}
        </p>
      )}
    </>
  );
}
