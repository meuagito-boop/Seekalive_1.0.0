import { CommercialDiscoveryCity } from "@/modules/seek/components/CommercialDiscoveryCity";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { DiscoveryLocation } from "@/modules/seek/utils/seekDiscovery";
import { emptyWeeklyHours } from "@/modules/profile/commercial-profile/utils/businessHours";
import { businessDays, type BusinessDayHours, type BusinessDayKey, type WeeklyOpeningHours } from "@/modules/profile/commercial-profile/types/businessHours";
import type { UseFormReturn } from "react-hook-form";
import type { ProfileEditFormValues } from "@/modules/profile/types/profileEditSchema";
import { serviceFields } from "@/modules/profile/types/profileEditSchema";

type Props = {
  form: UseFormReturn<ProfileEditFormValues>;
  discoveryCity: DiscoveryLocation | null;
  onDiscoveryCityChange: (city: DiscoveryLocation | null) => void;
  weeklyHours: WeeklyOpeningHours;
  updateDayHours: (day: BusinessDayKey, changes: Partial<BusinessDayHours>) => void;
  hoursError: string;
  isServerAccount: boolean;
};

export function CommercialProfileFields({
  form,
  discoveryCity,
  onDiscoveryCityChange,
  weeklyHours,
  updateDayHours,
  hoursError,
  isServerAccount,
}: Props) {
  return (
    <section className="space-y-5 border-t border-border pt-5">
      <div>
        <h2 className="font-bold">Informações do comércio</h2>
        <p className="mt-1 text-xs text-muted-foreground">Esses dados aparecem no perfil comercial do Seek.</p>
      </div>
      <CommercialDiscoveryCity value={discoveryCity} onChange={onDiscoveryCityChange} />
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
            {businessDays.map((day) => {
              const value = weeklyHours[day.key] ?? emptyWeeklyHours()[day.key];
              return (
                <div key={day.key} className="rounded-xl border border-border bg-card/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-[8rem] text-sm font-medium">{day.label}</span>
                    <select
                      value={value.status}
                      onChange={(event) => updateDayHours(day.key, { status: event.target.value as BusinessDayHours["status"] })}
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
                          onChange={(event) => updateDayHours(day.key, { opensAt: event.target.value })}
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
                          onChange={(event) => updateDayHours(day.key, { closesAt: event.target.value })}
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
  );
}
