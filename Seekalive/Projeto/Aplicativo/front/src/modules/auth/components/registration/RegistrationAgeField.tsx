import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

type Props = {
  control: Control<RegistrationFormValues>;
  accountType: RegistrationFormValues["accountType"];
};

export function RegistrationAgeField({ control, accountType }: Props) {
  const label = accountType === "commercial" ? "Idade do responsável" : "Idade";

  return (
    <FormField
      control={control}
      name="age"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              {...field}
              type="number"
              min={18}
              max={120}
              inputMode="numeric"
              aria-label={label}
              placeholder={label}
              data-testid="input-age"
              className="h-12 bg-card border-border rounded-xl"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
