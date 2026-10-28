import type { Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
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
          <div
            className="flex items-center gap-3"
            data-testid="checkbox-terms"
          >
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) =>
                  field.onChange(checked === true)
                }
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className="h-5 w-5 rounded border-2 border-border shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:border-primary"
              />
            </FormControl>
            <FormLabel className="cursor-pointer text-sm leading-normal text-muted-foreground">
              Aceito os{" "}
              <span className="text-primary">Termos de Serviço</span>{" "}
              e{" "}
              <span className="text-primary">Política de Privacidade</span>
            </FormLabel>
          </div>
          <FormDescription className="sr-only">
            O aceite é obrigatório para concluir o cadastro.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
