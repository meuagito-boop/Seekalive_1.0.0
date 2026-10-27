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
};

export function CommercialRegistrationNameField({ control }: Props) {
  return (
    <FormField
      control={control}
      name="businessName"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              {...field}
              aria-label="Nome da empresa ou do prestador de serviço"
              autoComplete="organization"
              placeholder="Nome da empresa ou do prestador de serviço"
              data-testid="input-business-name"
              className="h-12 bg-card border-border rounded-xl"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
