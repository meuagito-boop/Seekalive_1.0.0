import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

type Props = {
  control: Control<RegistrationFormValues>;
  accountType: RegistrationFormValues["accountType"];
};

function formatDateOfBirthInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function RegistrationDateOfBirthField({ control, accountType }: Props) {
  const label =
    accountType === "commercial"
      ? "Data de nascimento do responsável"
      : "Data de nascimento";

  return (
    <FormField
      control={control}
      name="dateOfBirth"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              maxLength={10}
              aria-label={`${label}, no formato dia, mês e ano`}
              placeholder="DD/MM/AAAA"
              data-testid="input-date-of-birth"
              className="h-12 rounded-xl border-border bg-card"
              onChange={(event) =>
                field.onChange(formatDateOfBirthInput(event.target.value))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
