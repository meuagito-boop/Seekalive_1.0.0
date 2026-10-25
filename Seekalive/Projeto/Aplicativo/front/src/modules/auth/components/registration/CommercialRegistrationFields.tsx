import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { commercialCategories } from "@/modules/profile/commercial-profile/data/categories";
import type { RegistrationFormValues } from "@/modules/auth/types/registrationSchema";

export function CommercialRegistrationFields() {
  const { control } = useFormContext<RegistrationFormValues>();

  return (
    <>
      <FormField
        control={control}
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
      <FormField
        control={control}
        name="age"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} type="number" min={18} max={120} inputMode="numeric" aria-label="Idade do responsável" placeholder="Idade do responsável" data-testid="input-age" className="h-12 bg-card border-border rounded-xl" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
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
        control={control}
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
        control={control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} aria-label="Endereço" autoComplete="street-address" placeholder="Endereço" data-testid="input-business-address" className="h-12 bg-card border-border rounded-xl" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["postalCode", "CEP", "postal-code", "input-postal-code"],
          ["city", "Cidade", "address-level2", "input-city"],
          ["state", "Estado", "address-level1", "input-state"],
          ["country", "País", "country-name", "input-country"],
        ] as const).map(([name, label, autoComplete, testId]) => (
          <FormField
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} aria-label={label} autoComplete={autoComplete} placeholder={label} data-testid={testId} className="h-12 bg-card border-border rounded-xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </>
  );
}
