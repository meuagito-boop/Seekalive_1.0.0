import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { AccountPatch, MyAccountResponse } from "@workspace/api-client-react";
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
import { myAccountToUser, socialGraphApi } from "@/services/socialGraphApi";
import { businessDays, type BusinessDayHours, type BusinessDayKey, type WeeklyOpeningHours } from "@/types/profiles/commercial/businessHours";
import { emptyWeeklyHours, formatWeeklyHours, hasInvalidOpenHours, makeWeeklyHours } from "@/lib/businessHours";
import { UnavailableState } from "@/components/content/StateBlocks";

const schema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  displayName: z.string().trim().max(100),
  username: z.string().trim().min(3).max(20).regex(/^[a-z0-9_]+$/),
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
  const {
    currentUser: signedInUser,
    isAuthenticated,
    isDevelopmentPreview,
    updateAccount,
  } = useAppContext();
  const { addUser } = useSocial();
  const currentUser = signedInUser ?? (import.meta.env.DEV ? mockCurrentUser : null);
  const isServerAccount = isAuthenticated && !isDevelopmentPreview;
  const profile = currentUser?.commercialProfile;
  const [ownerProfile, setOwnerProfile] = useState<MyAccountResponse | null>(null);
  const [accountLoadError, setAccountLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
      firstName: currentUser?.firstName ?? currentUser?.displayName.split(/\s+/)[0] ?? "",
      lastName: currentUser?.lastName ?? currentUser?.displayName.split(/\s+/).slice(1).join(" ") ?? "",
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

  useEffect(() => {
    if (!isServerAccount || !signedInUser) return;
    let active = true;
    setAccountLoadError("");
    socialGraphApi.getMyAccount()
      .then((response) => {
        if (!active) return;
        setOwnerProfile(response);
        const user = myAccountToUser(response);
        updateAccount(user);
        addUser(user);
        const commercial = response.commercialProfile;
        form.reset({
          firstName: response.firstName ?? "",
          lastName: response.lastName ?? "",
          displayName: response.account.displayName,
          username: response.account.username,
          bio: response.account.bio,
          location: response.account.location ?? "",
          website: response.account.website ?? "",
          businessAddress: commercial?.address ?? "",
          priceLevel: currentUser?.commercialProfile?.priceLevel?.toString() ?? "",
          serviceDelivery: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.delivery),
          serviceDineIn: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.dineIn),
          serviceTableService: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.tableService),
          serviceReservations: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.reservations),
          serviceAppointments: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.appointments),
          serviceTakeout: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.takeout),
        });
        if (commercial) {
          setDiscoveryCity({
            id: "",
            city: commercial.cityName,
            state: commercial.stateName,
            source: "manual",
            label: `${commercial.cityName}, ${commercial.stateName}`,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAccountLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados da conta.");
        }
      });
    return () => {
      active = false;
    };
  }, [isServerAccount, signedInUser?.id]);

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
  const publicNameChangeDate = ownerProfile?.publicNameChangeAvailableAt
    ? new Date(ownerProfile.publicNameChangeAvailableAt)
    : null;
  const usernameChangeDate = ownerProfile?.usernameChangeAvailableAt
    ? new Date(ownerProfile.usernameChangeAvailableAt)
    : null;
  const publicNameLocked = isServerAccount && (
    !publicNameChangeDate || publicNameChangeDate.getTime() > Date.now()
  );
  const usernameLocked = isServerAccount && (
    !usernameChangeDate || usernameChangeDate.getTime() > Date.now()
  );
  const formatChangeDate = (value: Date | null) => value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(value)
    : "";

  function updateDayHours(day: BusinessDayKey, changes: Partial<BusinessDayHours>) {
    setHoursTouched(true);
    setHoursError("");
    setWeeklyHours(previous => ({
      ...previous,
      [day]: { ...previous[day], ...changes },
    }));
  }

  async function onSubmit(values: FormValues) {
    setSaveError("");
    if (activeUser.accountType === "personal") {
      if (values.firstName.trim().length < 2) {
        form.setError("firstName", { type: "validate", message: "Informe seu nome." });
        return;
      }
      if (values.lastName.trim().length < 2) {
        form.setError("lastName", { type: "validate", message: "Informe seu sobrenome." });
        return;
      }
    } else if (values.displayName.trim().length < 2) {
      form.setError("displayName", { type: "validate", message: "Informe o nome da empresa ou estabelecimento." });
      return;
    }
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

    if (isServerAccount) {
      if (!ownerProfile) {
        setSaveError(accountLoadError || "Aguarde o carregamento dos dados da conta antes de salvar.");
        return;
      }
      const nextUsername = values.username.trim().replace(/^@/, "").toLowerCase();
      const usernameChanged = nextUsername !== ownerProfile.account.username;
      if (
        usernameChanged
        && !window.confirm(
          "Ao alterar seu @, o anterior ficará indisponível para todas as contas, inclusive você, por 30 dias. Depois desse prazo, outra conta poderá usá-lo. Deseja continuar?",
        )
      ) {
        return;
      }

      const patch: AccountPatch = { version: ownerProfile.account.version };
      if (usernameChanged) patch.username = nextUsername;
      if (activeUser.accountType === "personal") {
        if (
          values.firstName.trim() !== (ownerProfile.firstName ?? "")
          || values.lastName.trim() !== (ownerProfile.lastName ?? "")
        ) {
          patch.firstName = values.firstName.trim();
          patch.lastName = values.lastName.trim();
        }
      } else if (values.displayName.trim() !== ownerProfile.account.displayName) {
        patch.displayName = values.displayName.trim();
      }
      if (values.bio.trim() !== ownerProfile.account.bio) patch.bio = values.bio.trim();
      if ((values.location?.trim() || null) !== (ownerProfile.account.location ?? null)) {
        patch.location = values.location?.trim() || null;
      }
      if ((values.website?.trim() || null) !== (ownerProfile.account.website ?? null)) {
        patch.website = values.website?.trim() || null;
      }
      if (activeUser.accountType === "commercial" && ownerProfile.commercialProfile) {
        const currentCommercial = ownerProfile.commercialProfile;
        const nextAddress = businessAddress?.trim() || currentCommercial.address;
        const nextCity = discoveryCity?.city ?? currentCommercial.cityName;
        const nextState = discoveryCity?.state ?? currentCommercial.stateName;
        if (
          nextAddress !== currentCommercial.address
          || nextCity !== currentCommercial.cityName
          || nextState !== currentCommercial.stateName
        ) {
          patch.commercialProfile = {
            address: nextAddress,
            postalCode: currentCommercial.postalCode,
            cityName: nextCity,
            stateName: nextState,
            countryName: currentCommercial.countryName,
          };
        }
      }
      if (Object.keys(patch).length === 1) {
        setSaveError("Nenhuma alteração disponível para salvar nesta etapa.");
        return;
      }

      setIsSaving(true);
      try {
        const response = await socialGraphApi.updateMyAccount(patch);
        setOwnerProfile(response);
        const mappedUser = myAccountToUser(response);
        const updatedUser = {
          ...activeUser,
          ...mappedUser,
          commercialProfile: activeUser.commercialProfile && mappedUser.commercialProfile
            ? { ...activeUser.commercialProfile, ...mappedUser.commercialProfile }
            : mappedUser.commercialProfile,
        };
        updateAccount(updatedUser);
        addUser(updatedUser);
        setLocation(`/profile/${updatedUser.username}`);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const updatedUser = {
      ...activeUser,
      ...profileValues,
      firstName: activeUser.accountType === "personal" ? values.firstName.trim() : activeUser.firstName,
      lastName: activeUser.accountType === "personal" ? values.lastName.trim() : activeUser.lastName,
      displayName: activeUser.accountType === "personal"
        ? `${values.firstName.trim()} ${values.lastName.trim()}`.trim()
        : values.displayName.trim(),
      username: values.username.trim().replace(/^@/, "").toLowerCase(),
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
        <Button
          type="submit"
          form="edit-form"
          disabled={isSaving || (isServerAccount && !ownerProfile)}
          className="rounded-full h-8 px-5 text-sm font-semibold"
          data-testid="button-save"
        >
          {isSaving ? "Salvando…" : "Salvar"}
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
            {activeUser.accountType === "personal" ? (
              <>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Nome</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={publicNameLocked} data-testid="input-first-name" className="h-12 bg-card border-border rounded-xl" />
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
                      <FormLabel className="text-sm text-muted-foreground">Sobrenome</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={publicNameLocked} data-testid="input-last-name" className="h-12 bg-card border-border rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Nome da empresa ou estabelecimento</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={publicNameLocked} data-testid="input-display-name" className="h-12 bg-card border-border rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {publicNameLocked && publicNameChangeDate && (
              <p className="text-xs text-muted-foreground" data-testid="name-change-availability">
                O nome público poderá ser alterado novamente em{" "}
                <time dateTime={publicNameChangeDate.toISOString()}>{formatChangeDate(publicNameChangeDate)}</time>.
              </p>
            )}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Identificador social (@)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input {...field} disabled={usernameLocked} data-testid="input-username" className="h-12 bg-card border-border rounded-xl pl-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
              O nome identifica a pessoa ou empresa; o @ é exclusivo e identifica a conta. Ao trocar o @, o anterior fica indisponível para todos por 30 dias.
              {usernameLocked && usernameChangeDate && (
                <>
                  {" "}Você poderá alterá-lo novamente em{" "}
                  <time dateTime={usernameChangeDate.toISOString()}>{formatChangeDate(usernameChangeDate)}</time>.
                </>
              )}
            </p>
            {(accountLoadError || saveError) && (
              <p role="alert" className="text-sm text-destructive">
                {saveError || accountLoadError}
              </p>
            )}
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
                  {isServerAccount && (
                    <p className="text-xs text-muted-foreground">
                      Horários, faixa de preço e serviços ainda não estão conectados ao servidor; nesta conta, a edição deles está temporariamente desativada.
                    </p>
                  )}
                  <fieldset disabled={isServerAccount} className="min-w-0 space-y-5 disabled:opacity-60">
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
                  </fieldset>
              </section>
              </section>
            )}
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
