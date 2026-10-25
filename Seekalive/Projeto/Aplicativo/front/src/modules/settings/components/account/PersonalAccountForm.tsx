import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "../../screens/SettingsSubheader";
import type { AccountDraft } from "../../types/accountDraft";

interface PersonalAccountFormProps {
  draft: AccountDraft;
  email: string;
  error: string | null;
  isDisabled: boolean;
  isSaving: boolean;
  disabledField: string;
  onChange: (key: keyof AccountDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function PersonalAccountForm({
  draft,
  email,
  error,
  isDisabled,
  isSaving,
  disabledField,
  onChange,
  onSubmit,
}: PersonalAccountFormProps) {
  return (
    <>
      <SectionTitle>Dados pessoais</SectionTitle>
      <form onSubmit={onSubmit} className="px-4 pt-2">
        <fieldset disabled={isDisabled} className="min-w-0 space-y-3">
          <Input
            value={draft.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            aria-label="Nome"
            autoComplete="given-name"
            maxLength={80}
            required
            placeholder="Nome"
            className={disabledField}
          />
          <Input
            value={draft.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            aria-label="Sobrenome"
            autoComplete="family-name"
            maxLength={80}
            required
            placeholder="Sobrenome"
            className={disabledField}
          />
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
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="min-h-11 rounded-xl px-6" disabled={isDisabled} data-testid="button-save-profile">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Salvar dados da conta
          </Button>
        </fieldset>
      </form>
    </>
  );
}
