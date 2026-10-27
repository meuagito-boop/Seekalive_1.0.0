import { Check } from "lucide-react";
import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

type Props = {
  control: Control<RegistrationFormValues>;
};

export function RegistrationTermsField({ control }: Props) {
  return (
    <FormField
      control={control}
      name="terms"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <label
              className="flex items-center gap-3 cursor-pointer"
              data-testid="checkbox-terms"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={field.value}
                aria-label="Aceito os Termos de Serviço e a Política de Privacidade"
                className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${field.value ? "bg-primary border-primary" : "border-border"}`}
                onClick={() => field.onChange(!field.value)}
              >
                {field.value && (
                  <Check className="w-3 h-3 text-primary-foreground" />
                )}
              </button>
              <span className="text-sm text-muted-foreground">
                Aceito os{" "}
                <span className="text-primary hover:underline cursor-pointer">
                  Termos de Serviço
                </span>{" "}
                e{" "}
                <span className="text-primary hover:underline cursor-pointer">
                  Política de Privacidade
                </span>
              </span>
            </label>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
