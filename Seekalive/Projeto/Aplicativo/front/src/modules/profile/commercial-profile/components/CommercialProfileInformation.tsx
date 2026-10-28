import { Check, Clock3, Globe, MapPin } from "lucide-react";
import type { User } from "@/modules/profile/types/user";
import type { CommercialProfile } from "@/modules/profile/commercial-profile/types/commercialProfile";
import { weeklyHoursRows } from "@/modules/profile/commercial-profile/utils/businessHours";

type CommercialProfileInformationProps = {
  commercial: CommercialProfile;
  offeredServices: readonly {
    key: string;
    label: string;
    description: string;
  }[];
  openingHoursSummary: string;
  user: User;
};

export function CommercialProfileInformation({
  commercial,
  offeredServices,
  openingHoursSummary,
  user,
}: CommercialProfileInformationProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-bold">Sobre este lugar</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {user.bio}
          </p>
          {commercial.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {commercial.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {commercial.amenities && commercial.amenities.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Recursos e comodidades</h2>
            <div className="flex flex-wrap gap-2">
              {commercial.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />
                  {amenity}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-bold">
            Serviços e formas de atendimento
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Confira como este comércio atende seus clientes.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {offeredServices.length > 0 ? (
              offeredServices.map((service) => (
                <article
                  key={service.key}
                  className="rounded-2xl border border-border p-4"
                >
                  <h3 className="font-semibold">{service.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground sm:col-span-2">
                Este perfil ainda não informou serviços oferecidos.
              </p>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-border p-4">
          <h2 className="mb-2 font-bold">Informações do comércio</h2>
          <div className="divide-y divide-border">
            {commercial.weeklyHours ? (
              <div className="border-b border-border py-3 last:border-0">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                  Horário de funcionamento
                </div>
                <div className="space-y-1.5 pl-6">
                  {weeklyHoursRows(commercial.weeklyHours).map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <InfoLine
                icon={<Clock3 className="h-4 w-4" />}
                title="Horário de funcionamento"
                value={openingHoursSummary}
              />
            )}
            <InfoLine
              icon={<MapPin className="h-4 w-4" />}
              title="Endereço"
              value={commercial.address}
              href={mapsUrl(commercial.address)}
            />
            <InfoLine
              icon={<Globe className="h-4 w-4" />}
              title="Site"
              value={user.website ?? "Não informado"}
              href={user.website}
            />
            <InfoLine
              title="Faixa de preço"
              value={priceLabel(commercial.priceLevel) || "Não informada"}
            />
          </div>
        </section>
      </aside>
    </div>
  );
}

function priceLabel(level?: number) {
  return level ? "$".repeat(level) : "";
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function InfoLine({
  icon,
  title,
  value,
  href,
}: {
  icon?: React.ReactNode;
  title: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block break-words text-sm text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 break-words text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}
