import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

type Props = {
  control: Control<RegistrationFormValues>;
};

const commercialCategories = [
  { value: "restaurantes", label: "Restaurantes" },
  { value: "bares", label: "Bares" },
  { value: "cafes", label: "Cafés" },
  { value: "servicos", label: "Serviços" },
  { value: "compras", label: "Compras" },
  { value: "saude", label: "Saúde e beleza" },
  { value: "lazer", label: "Lazer" },
];

export function CommercialRegistrationFields({ control }: Props) {
  return (
    <>
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
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
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
              <select
                {...field}
                aria-label="Tipo de perfil no Seek"
                data-testid="select-discovery-kind"
                className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
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
              <Input
                {...field}
                aria-label="Endereço"
                autoComplete="street-address"
                placeholder="Endereço"
                data-testid="input-business-address"
                className="h-12 bg-card border-border rounded-xl"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  aria-label="CEP"
                  autoComplete="postal-code"
                  placeholder="CEP"
                  data-testid="input-postal-code"
                  className="h-12 bg-card border-border rounded-xl"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  aria-label="Cidade"
                  autoComplete="address-level2"
                  placeholder="Cidade"
                  data-testid="input-city"
                  className="h-12 bg-card border-border rounded-xl"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  aria-label="Estado"
                  autoComplete="address-level1"
                  placeholder="Estado"
                  data-testid="input-state"
                  className="h-12 bg-card border-border rounded-xl"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  aria-label="País"
                  autoComplete="country-name"
                  placeholder="País"
                  data-testid="input-country"
                  className="h-12 bg-card border-border rounded-xl"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
