import type { Control } from "react-hook-form";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

type Props = {
  control: Control<RegistrationFormValues>;
};

const accountTypes = [
  {
    value: "personal",
    title: "Pessoal",
    hint: "Para compartilhar e acompanhar pessoas",
  },
  {
    value: "commercial",
    title: "Comercial",
    hint: "Seu perfil Social também aparece no Seek",
  },
] as const;

export function RegistrationAccountTypeField({ control }: Props) {
  return (
    <FormField
      control={control}
      name="accountType"
      render={({ field }) => (
        <FormItem>
          <p className="mb-2 text-sm font-semibold">
            Escolha seu tipo de conta
          </p>
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            role="group"
            aria-label="Tipo de conta"
          >
            {accountTypes.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={field.value === option.value}
                aria-label={`${option.title}: ${option.hint}`}
                onClick={() => field.onChange(option.value)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  field.value === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {option.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
