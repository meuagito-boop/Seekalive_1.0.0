import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordPolicySchema } from "@workspace/api-zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { AuthApiError } from "@/modules/auth/services/http";
import { registerAccount as submitRegistration } from "@/modules/auth/services/registrationApi";
import { useAppContext } from "@/modules/app/state/AppContext";

const commercialCategories = [
  { value: "restaurantes", label: "Restaurantes" },
  { value: "bares", label: "Bares" },
  { value: "cafes", label: "Cafés" },
  { value: "servicos", label: "Serviços" },
  { value: "compras", label: "Compras" },
  { value: "saude", label: "Saúde e beleza" },
  { value: "lazer", label: "Lazer" },
];

const schema = z.object({
  accountType: z.enum(["personal", "commercial"]),
  firstName: z.string(),
  lastName: z.string(),
  businessName: z.string(),
  age: z.string().trim().regex(/^\d{1,3}$/, "Informe uma idade válida")
    .refine(value => Number(value) >= 18 && Number(value) <= 120, "O cadastro está disponível para pessoas com 18 anos ou mais"),
  businessCategory: z.string(),
  discoveryKind: z.enum(["place", "provider"]),
  address: z.string(),
  postalCode: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  username: z.string().trim()
    .min(3, "O nome de usuário deve ter ao menos 3 caracteres")
    .max(20, "O nome de usuário deve ter no máximo 20 caracteres")
    .regex(/^[a-z0-9_]+$/, "Use letras minúsculas, números e _"),
  email: z.string().trim().email("E-mail inválido").max(254, "O e-mail é muito longo"),
  password: passwordPolicySchema,
  confirmPassword: passwordPolicySchema,
  terms: z.boolean().refine(v => v, "Aceite os termos para continuar"),
}).superRefine((data, ctx) => {
  if (data.accountType === "personal") {
    if (data.firstName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe seu nome", path: ["firstName"] });
    }
    if (data.lastName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe seu sobrenome", path: ["lastName"] });
    }
  } else if (data.businessName.trim().length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o nome da empresa ou do prestador", path: ["businessName"] });
  }
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Senhas não coincidem",
      path: ["confirmPassword"],
    });
  }
  if (data.accountType === "commercial" && !data.businessCategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecione a categoria do perfil comercial",
      path: ["businessCategory"],
    });
  }
  if (data.accountType === "commercial") {
    const requiredBusinessFields = [
      ["address", "Informe o endereço", 3],
      ["postalCode", "Informe o CEP", 5],
      ["city", "Informe a cidade", 2],
      ["state", "Informe o estado", 2],
      ["country", "Informe o país", 2],
    ] as const;
    for (const [field, message, min] of requiredBusinessFields) {
      if (data[field].trim().length < min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
      }
    }
  }
});

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setPendingVerificationEmail } = useAppContext();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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

  async function onSubmit(values: FormValues) {
    const username = values.username.trim().replace(/^@/, "").toLowerCase();
    const email = values.email.trim().toLowerCase();
    const common = {
      age: Number(values.age),
      username,
      email,
      password: values.password,
      passwordConfirmation: values.confirmPassword,
      acceptedTermsVersion: "v1",
    };
    const payload = values.accountType === "personal"
      ? {
          ...common,
          accountType: "personal" as const,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
        }
      : {
          ...common,
          accountType: "commercial" as const,
          businessName: values.businessName.trim(),
          categoryKey: values.businessCategory,
          discoveryKind: values.discoveryKind,
          address: values.address.trim(),
          postalCode: values.postalCode.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          country: values.country.trim(),
        };

    try {
      const result = await submitRegistration(payload);
      setPendingVerificationEmail(email);
      toast({ title: "Confirme seu e-mail", description: result.message });
      setLocation("/verify-email");
    } catch (error) {
      if (error instanceof AuthApiError && error.key === "USERNAME_UNAVAILABLE") {
        form.setError("username", { type: "server", message: error.message });
        return;
      }
      toast({
        title: "Não foi possível concluir o cadastro",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }

  const username = form.watch("username").replace(/^@/, "").toLowerCase();
  const accountType = form.watch("accountType");
  const isUsernameValidFormat = username.length > 2 && username.length <= 20 && /^[a-z0-9_]+$/.test(username);

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

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Seu próximo capítulo começa aqui</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Criar conta</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">Um perfil para compartilhar sua vida e, se quiser, apresentar seu negócio no Seek.</p>
        <p role="note" className="mb-6 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs leading-5 text-muted-foreground">
          Você só poderá entrar depois de confirmar o e-mail. O cadastro não cria uma sessão antes da verificação.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <p className="mb-2 text-sm font-semibold">Escolha seu tipo de conta</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Tipo de conta">
                    {[
                      { value: "personal", title: "Pessoal", hint: "Para compartilhar e acompanhar pessoas" },
                      { value: "commercial", title: "Comercial", hint: "Seu perfil Social também aparece no Seek" },
                    ].map((option) => (
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
                        <span className="block text-sm font-semibold">{option.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {accountType === "personal" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} aria-label="Nome" autoComplete="given-name" placeholder="Nome" data-testid="input-first-name" className="h-12 bg-card border-border rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} aria-label="Sobrenome" autoComplete="family-name" placeholder="Sobrenome" data-testid="input-last-name" className="h-12 bg-card border-border rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} aria-label="Nome da empresa ou do prestador de serviço" autoComplete="organization" placeholder="Nome da empresa ou do prestador de serviço" data-testid="input-business-name" className="h-12 bg-card border-border rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} type="number" min={18} max={120} inputMode="numeric" aria-label={accountType === "commercial" ? "Idade do responsável" : "Idade"} placeholder={accountType === "commercial" ? "Idade do responsável" : "Idade"} data-testid="input-age" className="h-12 bg-card border-border rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {accountType === "commercial" && (
              <>
                <FormField
                  control={form.control}
                  name="businessCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <select
                          {...field}
                          aria-label="Categoria do perfil comercial"
                          data-testid="select-business-category"
                          className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus:border-primary/50"
                        >
                           <option value="">Categoria do perfil comercial</option>
                          {commercialCategories.map((category) => (
                            <option key={category.value} value={category.value}>{category.label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discoveryKind"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <select {...field} aria-label="Tipo de perfil no Seek" data-testid="select-discovery-kind" className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus:border-primary/50">
                          <option value="place">Empresa ou estabelecimento</option>
                          <option value="provider">Prestador de serviço</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><Input {...field} aria-label="Endereço" autoComplete="street-address" placeholder="Endereço" data-testid="input-business-address" className="h-12 bg-card border-border rounded-xl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} aria-label="CEP" autoComplete="postal-code" placeholder="CEP" data-testid="input-postal-code" className="h-12 bg-card border-border rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} aria-label="Cidade" autoComplete="address-level2" placeholder="Cidade" data-testid="input-city" className="h-12 bg-card border-border rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} aria-label="Estado" autoComplete="address-level1" placeholder="Estado" data-testid="input-state" className="h-12 bg-card border-border rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} aria-label="País" autoComplete="country-name" placeholder="País" data-testid="input-country" className="h-12 bg-card border-border rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input
                        {...field}
                        aria-label="Nome de usuário"
                        placeholder="nome de usuário"
                        data-testid="input-username"
                        className="h-12 bg-card border-border rounded-xl pl-8 pr-10"
                      />
                      {isUsernameValidFormat && (
                        <span aria-label="Formato válido" className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      aria-label="E-mail"
                      autoComplete="email"
                      placeholder="E-mail"
                      data-testid="input-email"
                      className="h-12 bg-card border-border rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        minLength={8}
                        maxLength={128}
                        aria-label="Senha"
                        autoComplete="new-password"
                        placeholder="Senha"
                        data-testid="input-password"
                        className="h-12 bg-card border-border rounded-xl pr-12"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    De 8 a 128 caracteres, com maiúscula, minúscula, número e caractere especial.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      minLength={8}
                      maxLength={128}
                      aria-label="Confirmar senha"
                      autoComplete="new-password"
                      placeholder="Confirmar senha"
                      data-testid="input-confirm-password"
                      className="h-12 bg-card border-border rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <label className="flex items-center gap-3 cursor-pointer" data-testid="checkbox-terms">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={field.value}
                        aria-label="Aceito os Termos de Serviço e a Política de Privacidade"
                        className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${field.value ? "bg-primary border-primary" : "border-border"}`}
                        onClick={() => field.onChange(!field.value)}
                      >
                        {field.value && <Check className="w-3 h-3 text-primary-foreground" />}
                      </button>
                      <span className="text-sm text-muted-foreground">
                        Aceito os{" "}
                        <span className="text-primary hover:underline cursor-pointer">Termos de Serviço</span>
                        {" "}e{" "}
                        <span className="text-primary hover:underline cursor-pointer">Política de Privacidade</span>
                      </span>
                    </label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          <Link href="/login" className="text-primary font-semibold hover:underline" data-testid="link-login">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
