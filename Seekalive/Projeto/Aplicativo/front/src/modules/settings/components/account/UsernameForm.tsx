import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "../../screens/SettingsSubheader";

interface UsernameFormProps {
  username: string;
  currentUsername: string;
  error: string | null;
  isDisabled: boolean;
  isSaving: boolean;
  disabledField: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function UsernameForm({
  username,
  currentUsername,
  error,
  isDisabled,
  isSaving,
  disabledField,
  onChange,
  onSubmit,
}: UsernameFormProps) {
  return (
    <>
      <SectionTitle>Nome de usuário</SectionTitle>
      <form onSubmit={onSubmit} className="px-4 pt-2" noValidate>
        <fieldset disabled={isDisabled} className="min-w-0 space-y-3">
          <p className="text-xs text-muted-foreground">
            Atual: <span className="font-semibold text-foreground">@{currentUsername}</span>. O nome é único na plataforma.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" aria-hidden>@</span>
            <Input
              value={username}
              onChange={(event) => onChange(event.target.value)}
              placeholder="novo_usuario"
              aria-label="Novo nome de usuário"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "username-error" : undefined}
              autoCapitalize="none"
              autoComplete="username"
              maxLength={20}
              data-testid="input-new-username"
              className={`${disabledField} pl-8`}
            />
          </div>
          {error && <p id="username-error" role="alert" className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="min-h-11 rounded-xl px-6"
            disabled={isDisabled || !username.trim()}
            data-testid="button-update-username"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Atualizar nome de usuário
          </Button>
        </fieldset>
      </form>
    </>
  );
}
