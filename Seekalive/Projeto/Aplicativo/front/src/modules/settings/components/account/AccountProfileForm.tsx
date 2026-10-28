import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/modules/settings/components/SettingsSubheader";
import type { AccountDraft } from "@/modules/settings/types/accountSettings";

interface AccountProfileFormProps {
  isCommercial: boolean;
  draft: AccountDraft;
  email: string;
  disabled: boolean;
  disabledField: string;
  profileError: string | null;
  isSaving: boolean;
  onDraftChange: (key: keyof AccountDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AccountProfileForm({
  isCommercial,
  draft,
  email,
  disabled,
  disabledField,
  profileError,
  isSaving,
  onDraftChange,
  onSubmit,
}: AccountProfileFormProps) {
  return (
    <>
      <SectionTitle>
        {isCommercial ? "Dados comerciais" : "Dados pessoais"}
      </SectionTitle>
      <form onSubmit={onSubmit} className="px-4 pt-2">
        <fieldset disabled={disabled} className="min-w-0 space-y-3">
          {isCommercial ? (
            <>
              <Input
                value={draft.businessName}
                onChange={(event) =>
                  onDraftChange("businessName", event.target.value)
                }
                aria-label="Nome da empresa ou prestador de serviço"
                autoComplete="organization"
                maxLength={100}
                required
                placeholder="Nome da empresa ou prestador de serviço"
                className={disabledField}
              />
              <Input
                value={draft.address}
                onChange={(event) =>
                  onDraftChange("address", event.target.value)
                }
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
                  onChange={(event) =>
                    onDraftChange("postalCode", event.target.value)
                  }
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
                  onChange={(event) =>
                    onDraftChange("cityName", event.target.value)
                  }
                  aria-label="Cidade"
                  autoComplete="address-level2"
                  maxLength={120}
                  required
                  placeholder="Cidade"
                  className={disabledField}
                />
                <Input
                  value={draft.stateName}
                  onChange={(event) =>
                    onDraftChange("stateName", event.target.value)
                  }
                  aria-label="Estado"
                  autoComplete="address-level1"
                  maxLength={100}
                  required
                  placeholder="Estado"
                  className={disabledField}
                />
                <Input
                  value={draft.countryName}
                  onChange={(event) =>
                    onDraftChange("countryName", event.target.value)
                  }
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
                onChange={(event) =>
                  onDraftChange("firstName", event.target.value)
                }
                aria-label="Nome"
                autoComplete="given-name"
                maxLength={80}
                required
                placeholder="Nome"
                className={disabledField}
              />
              <Input
                value={draft.lastName}
                onChange={(event) =>
                  onDraftChange("lastName", event.target.value)
                }
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
          <p className="text-xs text-muted-foreground">
            Para alterar o e-mail, use o fluxo de confirmação abaixo.
          </p>
          {profileError && (
            <p role="alert" className="text-sm text-destructive">
              {profileError}
            </p>
          )}
          <Button
            type="submit"
            className="min-h-11 rounded-xl px-6"
            disabled={disabled}
            data-testid="button-save-profile"
          >
            {isSaving && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Salvar dados da conta
          </Button>
        </fieldset>
      </form>
    </>
  );
}
