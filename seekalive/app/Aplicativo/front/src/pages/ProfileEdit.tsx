import { useLocation } from "wouter";
import { useState } from "react";
import { CommercialDiscoveryCity } from "@/components/seek/CommercialDiscoveryCity";
import type { DiscoveryLocation } from "@/lib/seekDiscovery";
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
import { businessDays, type BusinessDayHours, type BusinessDayKey, type WeeklyOpeningHours } from "@/types/businessHours";
import { emptyWeeklyHours, formatWeeklyHours, hasInvalidOpenHours, makeWeeklyHours } from "@/lib/businessHours";
import { UnavailableState } from "@/components/content/StateBlocks";

const schema = z.object({
  displayName: z.string().min(2),
  username: z.string().min(3).regex(/^[a-z0-9_]+$/),
  bio: z.string().max(160),
  location: z.string().max(50).optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  businessAddress: z.string().max(120).optional(),
  priceLevel: z.string().regex(/^$|^[1-4]$/),
  serviceDelivery: z.enum(["unknown", "yes", "no"]),
  serviceDineIn: z.enum(["unknown", "yes", "no"]),
  serviceTableService: z.enum(["unknown", "yes", "no"]),
  serviceReservations: z.enum(["unknown", "yes", "no"]),
  serviceAppointments: z.enum(["unknown", "yes", "no"]),
  serviceTakeout: z.enum(["unknown", "yes", "no"]),
});

type FormValues = z.infer<typeof schema>;
type ServiceStatus = "unknown" | "yes" | "no";

function serviceStatus(value?: boolean): ServiceStatus {
  return value === undefined ? "unknown" : value ? "yes" : "no";
}

function serviceValue(value: ServiceStatus): boolean | undefined {
  return value === "unknown" ? undefined : value === "yes";
}

const serviceFields = [
  { name: "serviceDelivery", label: "Delivery" },
  { name: "serviceDineIn", label: "Atendimento no local" },
  { name: "serviceTableService", label: "Atendimento à mesa" },
  { name: "serviceReservations", label: "Reservas" },
  { name: "serviceAppointments", label: "Agendamento" },
  { name: "serviceTakeout", label: "Retirada no local" },
] as const;

export default function ProfileEdit() {
  const [, setLocation] = useLocation();
  const { currentUser: signedInUser, updateAccount } = useAppContext();
  const { addUser } = useSocial();
  const currentUser = signedInUser ?? (import.meta.env.DEV ? mockCurrentUser : null);
  const profile = currentUser?.commercialProfile;
  const [discoveryCity, setDiscoveryCity] = useState<DiscoveryLocation | null>(() =>
    profile?.cityId && profile.cityName && profile.cityState
      ? { id: profile.cityId, city: profile.cityName, state: profile.cityState, source: "manual", label: `${profile.cityName}, ${profile.cityState}` }
      : null);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyOpeningHours>(() =>
    makeWeeklyHours(profile?.weeklyHours, profile?.openingHours));
  const [hoursTouched, setHoursTouched] = useState(false);
  const [hoursError, setHoursError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: currentUser?.displayName ?? "",
      username: currentUser?.username ?? "",
      bio: currentUser?.bio ?? "",
      location: currentUser?.location ?? "",
      website: currentUser?.website ?? "",
      businessAddress: currentUser?.commercialProfile?.address ?? "",
      priceLevel: currentUser?.commercialProfile?.priceLevel?.toString() ?? "",
      serviceDelivery: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.delivery),
      serviceDineIn: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.dineIn),
      serviceTableService: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.tableService),
      serviceReservations: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.reservations),
      serviceAppointments: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.appointments),
      serviceTakeout: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.takeout),
    },
  });

  if (!currentUser) {
    return (
      <UnavailableState
        title="Conta indisponível"
        description="Entre na sua conta para editar o perfil."
        action={<Button onClick={() => setLocation("/login")} className="rounded-full">Ir para o login</Button>}
      />
    );
  }
  const activeUser = currentUser;
  function updateDayHours(day: BusinessDayKey, changes: Partial<BusinessDayHours>) {
    setHoursTouched(true);
    setHoursError("");
    setWeeklyHours(previous => ({
      ...previous,
      [day]: { ...previous[day], ...changes },
    }));
  }

  function onSubmit(values: FormValues) {
    if (activeUser.accountType === "commercial" && hoursTouched && hasInvalidOpenHours(weeklyHours)) {
      setHoursError("Informe horários válidos para cada dia marcado como aberto.");
      return;
    }
    const {
      businessAddress,
      priceLevel,
      serviceDelivery,
      serviceDineIn,
      serviceTableService,
      serviceReservations,
      serviceAppointments,
      serviceTakeout,
      ...profileValues
    } = values;
    const nextWeeklyHours = hoursTouched
      ? weeklyHours
      : profile?.weeklyHours;
    const nextOpeningHours = hoursTouched
      ? formatWeeklyHours(weeklyHours) === "Horário não informado" ? undefined : formatWeeklyHours(weeklyHours)
      : profile?.weeklyHours
        ? formatWeeklyHours(profile.weeklyHours)
        : profile?.openingHours;
    const updatedUser = {
      ...activeUser,
      ...profileValues,
      location: values.location || undefined,
      website: values.website || undefined,
      commercialProfile: activeUser.commercialProfile
        ? {
            ...activeUser.commercialProfile,
            cityId: discoveryCity?.id,
            cityName: discoveryCity?.city,
            cityState: discoveryCity?.state,
            address: businessAddress?.trim() || activeUser.commercialProfile.address,
            weeklyHours: nextWeeklyHours,
            openingHours: nextOpeningHours,
            priceLevel: priceLevel
              ? Number(priceLevel) as 1 | 2 | 3 | 4
              : undefined,
            serviceOptions: {
              delivery: serviceValue(serviceDelivery),
              dineIn: serviceValue(serviceDineIn),
              tableService: serviceValue(serviceTableService),
              reservations: serviceValue(serviceReservations),
              appointments: serviceValue(serviceAppointments),
              takeout: serviceValue(serviceTakeout),
            },
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
                <CommercialDiscoveryCity value={discoveryCity} onChange={setDiscoveryCity} />
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
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Dias e horários de funcionamento</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Defina cada dia separadamente. Dias sem informação não serão exibidos como horário confirmado.</p>
                  </div>
                  <div className="space-y-2">
                    {businessDays.map(day => {
                      const value = weeklyHours[day.key] ?? emptyWeeklyHours()[day.key];
                      return (
                        <div key={day.key} className="rounded-xl border border-border bg-card/50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="min-w-[8rem] text-sm font-medium">{day.label}</span>
                            <select
                              value={value.status}
                              onChange={event => updateDayHours(day.key, { status: event.target.value as BusinessDayHours["status"] })}
                              aria-label={`Situação de ${day.label}`}
                              data-testid={`select-hours-${day.key}`}
                              className="h-10 min-w-[9rem] rounded-lg border border-border bg-background px-3 text-sm"
                            >
                              <option value="unknown">Não informado</option>
                              <option value="open">Aberto</option>
                              <option value="closed">Fechado</option>
                            </select>
                          </div>
                          {value.status === "open" && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <label className="text-xs text-muted-foreground">
                                Abre às
                                <Input
                                  type="time"
                                  value={value.opensAt}
                                  onChange={event => updateDayHours(day.key, { opensAt: event.target.value })}
                                  aria-label={`Horário de abertura de ${day.label}`}
                                  data-testid={`input-hours-open-${day.key}`}
                                  className="mt-1 h-10 bg-background"
                                />
                              </label>
                              <label className="text-xs text-muted-foreground">
                                Fecha às
                                <Input
                                  type="time"
                                  value={value.closesAt}
                                  onChange={event => updateDayHours(day.key, { closesAt: event.target.value })}
                                  aria-label={`Horário de fechamento de ${day.label}`}
                                  data-testid={`input-hours-close-${day.key}`}
                                  className="mt-1 h-10 bg-background"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {hoursError && <p role="alert" className="text-sm text-destructive">{hoursError}</p>}
                </section>
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
                <div className="space-y-4 border-t border-border pt-5">
                  <div>
                    <h3 className="font-bold">Serviços e formas de atendimento</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Informe se oferece cada opção ou deixe como “Não informado”.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {serviceFields.map(({ name, label }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-muted-foreground">{label}</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                data-testid={`select-${name}`}
                                className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                              >
                                <option value="unknown">Não informado</option>
                                <option value="yes">Sim, oferece</option>
                                <option value="no">Não oferece</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
