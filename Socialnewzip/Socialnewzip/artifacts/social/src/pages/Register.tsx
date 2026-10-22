import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";
import type { User } from "@/data/mockData";

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
  displayName: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  accountType: z.enum(["personal", "commercial"]),
  businessCategory: z.string(),
  businessLocation: z.string(),
  username: z.string().min(3, "Username deve ter ao menos 3 caracteres").regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  confirmPassword: z.string(),
  terms: z.boolean().refine(v => v, "Aceite os termos para continuar"),
}).superRefine((data, ctx) => {
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
      message: "Selecione a categoria do comércio",
      path: ["businessCategory"],
    });
  }
  if (data.accountType === "commercial" && data.businessLocation.trim().length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe a cidade ou o bairro do comércio",
      path: ["businessLocation"],
    });
  }
});

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { registerAccount } = useAppContext();
  const { addUser, users } = useSocial();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      accountType: "personal",
      businessCategory: "",
      businessLocation: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  function onSubmit(values: FormValues) {
    if (users.some((user) => user.username === values.username)) {
      form.setError("username", { type: "manual", message: "Esse username já está em uso" });
      return;
    }

    const selectedCategory = commercialCategories.find((category) => category.value === values.businessCategory);
    const user: User = {
      id: `user_${values.username}`,
      username: values.username,
      displayName: values.displayName,
      bio: values.accountType === "commercial"
        ? `${selectedCategory?.label ?? "Comércio"} local no ${values.businessLocation}.`
        : "Novo por aqui.",
      avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(values.username)}`,
      coverUrl: `https://picsum.photos/seed/${encodeURIComponent(values.username)}/800/300`,
      location: values.accountType === "commercial" ? values.businessLocation : undefined,
      joinedAt: new Date().toISOString(),
      accountType: values.accountType,
      commercialProfile: values.accountType === "commercial" && selectedCategory
        ? {
            categoryKey: selectedCategory.value,
            category: selectedCategory.label,
            address: values.businessLocation,
            tags: [],
          }
        : undefined,
      stats: { posts: 0, followers: 0, following: 0, circles: 0 },
    };

    addUser(user);
    registerAccount(user);
    setLocation("/onboarding/interests");
  }

  const username = form.watch("username");
  const isUsernameAvailable = username.length > 2 && !users.some((user) => user.username === username);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-8">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight">Seekalive</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">Criar conta</h1>
        <p className="text-muted-foreground mb-8 text-sm">Junte-se ao universo.</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nome de exibição"
                      data-testid="input-display-name"
                      className="h-12 bg-card border-border rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <p className="text-sm font-semibold">Tipo de conta</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "personal", title: "Pessoal", hint: "Para compartilhar e acompanhar pessoas" },
                      { value: "commercial", title: "Comercial", hint: "Seu perfil Social também aparece no Seek" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={field.value === option.value}
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

            {form.watch("accountType") === "commercial" && (
              <>
                <FormField
                  control={form.control}
                  name="businessCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <select
                          {...field}
                          data-testid="select-business-category"
                          className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus:border-primary/50"
                        >
                          <option value="">Categoria do comércio</option>
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
                  name="businessLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Cidade ou bairro"
                          data-testid="input-business-location"
                          className="h-12 bg-card border-border rounded-xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        placeholder="username"
                        data-testid="input-username"
                        className="h-12 bg-card border-border rounded-xl pl-8 pr-10"
                      />
                      {isUsernameAvailable && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
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
                      placeholder="Email"
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
                        placeholder="Senha"
                        data-testid="input-password"
                        className="h-12 bg-card border-border rounded-xl pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
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
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${field.value ? "bg-primary border-primary" : "border-border"}`}
                        onClick={() => field.onChange(!field.value)}
                      >
                        {field.value && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
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
              data-testid="button-register"
            >
              Criar conta
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
