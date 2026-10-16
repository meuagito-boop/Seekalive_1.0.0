import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { currentUser as mockCurrentUser } from "@/data/mockData";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";

const schema = z.object({
  displayName: z.string().min(2),
  username: z.string().min(3).regex(/^[a-z0-9_]+$/),
  bio: z.string().max(160),
  location: z.string().max(50).optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  businessAddress: z.string().max(120).optional(),
  businessPhone: z.string().max(30).optional(),
  openingHours: z.string().max(120).optional(),
  priceLevel: z.string().regex(/^$|^[1-4]$/),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileEdit() {
  const [, setLocation] = useLocation();
  const { currentUser: signedInUser, updateAccount } = useAppContext();
  const { addUser } = useSocial();
  const currentUser = signedInUser ?? mockCurrentUser;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: currentUser.displayName,
      username: currentUser.username,
      bio: currentUser.bio,
      location: currentUser.location ?? "",
      website: currentUser.website ?? "",
      businessAddress: currentUser.commercialProfile?.address ?? "",
      businessPhone: currentUser.commercialProfile?.phone ?? "",
      openingHours: currentUser.commercialProfile?.openingHours ?? "",
      priceLevel: currentUser.commercialProfile?.priceLevel?.toString() ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    const updatedUser = {
      ...currentUser,
      ...values,
      location: values.location || undefined,
      website: values.website || undefined,
      commercialProfile: currentUser.commercialProfile
        ? {
            ...currentUser.commercialProfile,
            address: values.businessAddress?.trim() || currentUser.commercialProfile.address,
            phone: values.businessPhone?.trim() || undefined,
            openingHours: values.openingHours?.trim() || undefined,
            priceLevel: values.priceLevel
              ? Number(values.priceLevel) as 1 | 2 | 3 | 4
              : undefined,
          }
        : undefined,
    };
    updateAccount(updatedUser);
    addUser(updatedUser);
    setLocation(`/profile/${updatedUser.username}`);
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 h-14 border-b border-border">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Editar perfil</h1>
        <Button type="submit" form="edit-form" className="rounded-full h-8 px-5 text-sm font-semibold" data-testid="button-save">
          Salvar
        </Button>
      </div>

      <div className="relative mb-16">
        <div className="h-36 bg-gradient-to-br from-primary/20 via-accent/20 to-background relative cursor-pointer group overflow-hidden">
          <img src={currentUser.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="absolute -bottom-12 left-4 cursor-pointer group">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback className="text-2xl">{currentUser.displayName[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <Form {...form}>
          <form id="edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Nome de exibição</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-display-name" className="h-12 bg-card border-border rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input {...field} data-testid="input-username" className="h-12 bg-card border-border rounded-xl pl-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      data-testid="input-bio"
                      className="bg-card border-border rounded-xl resize-none"
                    />
                  </FormControl>
                  <div className="text-right text-xs text-muted-foreground">{field.value?.length ?? 0}/160</div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Localização</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Cidade, País" data-testid="input-location" className="h-12 bg-card border-border rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Website</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://seusite.com" data-testid="input-website" className="h-12 bg-card border-border rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {currentUser.accountType === "commercial" && (
              <section className="space-y-5 border-t border-border pt-5">
                <div>
                  <h2 className="font-bold">Informações do comércio</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Esses dados aparecem no perfil comercial do Seek.</p>
                </div>
                <FormField
                  control={form.control}
                  name="businessAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rua, número, bairro" data-testid="input-business-address" className="h-12 rounded-xl border-border bg-card" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="(11) 0000-0000" data-testid="input-business-phone" className="h-12 rounded-xl border-border bg-card" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="openingHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Horário de funcionamento</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Seg–Sex · 09h–18h" data-testid="input-opening-hours" className="h-12 rounded-xl border-border bg-card" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Faixa de preço</FormLabel>
                      <FormControl>
                        <select {...field} data-testid="select-price-level" className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground">
                          <option value="">Não informar</option>
                          <option value="1">$ · Econômico</option>
                          <option value="2">$$ · Moderado</option>
                          <option value="3">$$$ · Alto</option>
                          <option value="4">$$$$ · Premium</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            )}
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
