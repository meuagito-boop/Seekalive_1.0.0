import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { usernameSchema } from "@workspace/api-zod";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ApiRequestError } from "@/modules/app/api/httpClient";
import { useAppContext } from "@/modules/app/state/AppContext";
import { registrationFormSchema } from "@/modules/auth/application/registrationFormSchema";
import { toRegistrationPayload } from "@/modules/auth/application/registrationPayload";
import { CommercialRegistrationFields } from "@/modules/auth/components/registration/CommercialRegistrationFields";
import { CommercialRegistrationNameField } from "@/modules/auth/components/registration/CommercialRegistrationNameField";
import { PersonalRegistrationFields } from "@/modules/auth/components/registration/PersonalRegistrationFields";
import { RegistrationAgeField } from "@/modules/auth/components/registration/RegistrationAgeField";
import { RegistrationAccountTypeField } from "@/modules/auth/components/registration/RegistrationAccountTypeField";
import { RegistrationCredentialsFields } from "@/modules/auth/components/registration/RegistrationCredentialsFields";
import { RegistrationIdentityFields } from "@/modules/auth/components/registration/RegistrationIdentityFields";
import { RegistrationTermsField } from "@/modules/auth/components/registration/RegistrationTermsField";
import { registerAccount } from "@/modules/auth/services/registrationApi";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setPendingVerificationEmail } = useAppContext();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      accountType: "personal",
      firstName: "",
      lastName: "",
      businessName: "",
      age: "",
      businessCategory: "",
      discoveryKind: "place",
      address: "",
      postalCode: "",
      city: "",
      state: "",
      country: "Brasil",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  async function onSubmit(values: RegistrationFormValues) {
    const payload = toRegistrationPayload(values);

    try {
      const result = await registerAccount(payload);
      setPendingVerificationEmail(payload.email);
      toast({ title: "Confirme seu e-mail", description: result.message });
      setLocation("/verify-email");
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.key === "USERNAME_UNAVAILABLE"
      ) {
        form.setError("username", { type: "server", message: error.message });
        return;
      }
      toast({
        title: "Não foi possível concluir o cadastro",
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }

  const username = form.watch("username").replace(/^@/, "").toLowerCase();
  const accountType = form.watch("accountType");
  const isUsernameValidFormat = usernameSchema.safeParse(username).success;

  return (
    <div className="relative flex min-h-[100dvh] items-start justify-center overflow-hidden bg-background px-4 py-8 sm:items-center sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary/[0.055] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-px w-full bg-gradient-to-l from-transparent via-primary/20 to-transparent" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-lg rounded-[1.75rem] border border-border bg-card/85 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-9"
      >
        <div className="flex items-center gap-2 mb-8">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight">Seekalive</span>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Seu próximo capítulo começa aqui
        </p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Criar conta</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">
          Um perfil para compartilhar sua vida e, se quiser, apresentar seu
          negócio no Seek.
        </p>
        <p
          role="note"
          className="mb-6 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs leading-5 text-muted-foreground"
        >
          Você só poderá entrar depois de confirmar o e-mail. O cadastro não
          cria uma sessão antes da verificação.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RegistrationAccountTypeField control={form.control} />
            {accountType === "personal" ? (
              <PersonalRegistrationFields control={form.control} />
            ) : (
              <CommercialRegistrationNameField control={form.control} />
            )}
            <RegistrationAgeField
              control={form.control}
              accountType={accountType}
            />
            {accountType === "commercial" && (
              <CommercialRegistrationFields control={form.control} />
            )}
            <RegistrationIdentityFields
              control={form.control}
              usernameIsValid={isUsernameValidFormat}
            />
            <RegistrationCredentialsFields control={form.control} />
            <RegistrationTermsField control={form.control} />

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-base mt-2"
              disabled={form.formState.isSubmitting}
              data-testid="button-register"
            >
              {form.formState.isSubmitting ? "Enviando..." : "Criar conta"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-primary font-semibold hover:underline"
            data-testid="link-login"
          >
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
