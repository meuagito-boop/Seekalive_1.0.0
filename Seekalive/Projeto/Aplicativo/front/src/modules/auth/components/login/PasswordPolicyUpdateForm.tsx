import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { UseFormReturn } from "react-hook-form";
import type { PasswordUpdateFormValues } from "@/modules/auth/application/loginFormSchema";

type Props = {
  form: UseFormReturn<PasswordUpdateFormValues>;
  onSubmit: (values: PasswordUpdateFormValues) => void;
};

export function PasswordPolicyUpdateForm({ form, onSubmit }: Props) {
  return (
    <section
      aria-labelledby="password-policy-heading"
      className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4"
      data-testid="password-policy-update"
    >
      <h2
        id="password-policy-heading"
        className="mb-2 text-base font-semibold text-foreground"
      >
        Atualização obrigatória de senha
      </h2>
      <p className="mb-4 text-sm leading-5 text-muted-foreground">
        A senha atual não atende aos requisitos. Informe uma nova senha para
        continuar.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    aria-label="Nova senha"
                    placeholder="Nova senha"
                    className="h-12 rounded-xl border-border bg-card text-foreground"
                  />
                </FormControl>
                <FormDescription>
                  De 8 a 128 caracteres, com maiúscula, minúscula, número e
                  caractere especial.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passwordConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    aria-label="Confirme a nova senha"
                    placeholder="Confirme a nova senha"
                    className="h-12 rounded-xl border-border bg-card text-foreground"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={form.formState.isSubmitting}
            data-testid="button-update-password-policy"
          >
            {form.formState.isSubmitting
              ? "Atualizando..."
              : "Atualizar senha e entrar"}
          </Button>
        </form>
      </Form>
    </section>
  );
}
