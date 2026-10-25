import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/modules/settings/screens/SettingsSubheader";
import type { TrustedDeviceView } from "@/modules/auth/services/sessionApi";

interface TrustedDevicesSectionProps {
  devices: TrustedDeviceView[];
  devicesHaveMore: boolean;
  isLoading: boolean;
  pendingAction: string | null;
  error: string | null;
  formatDate: (value: string) => string;
  onRevokeDevice: (device: TrustedDeviceView) => void;
  onRevokeOtherDevices: () => void;
}

export function TrustedDevicesSection({
  devices,
  devicesHaveMore,
  isLoading,
  pendingAction,
  error,
  formatDate,
  onRevokeDevice,
  onRevokeOtherDevices,
}: TrustedDevicesSectionProps) {
  return (
    <>
      <SectionTitle>Instalações confiáveis</SectionTitle>
      <p className="px-4 pb-3 text-sm leading-6 text-muted-foreground">
        Cada instalação do navegador ou aplicativo recebe um token revogável. O Seekalive não usa IP nem impressão digital para reconhecer o dispositivo. Se os dados do navegador forem apagados, será necessário confirmar o e-mail novamente.
      </p>
      {isLoading && devices.length === 0 ? (
        <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Carregando instalações…</p>
      ) : devices.length === 0 ? (
        <p className="mx-4 rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          {error ? "Entre com uma conta autenticada para consultar as instalações." : "Nenhuma instalação confiável encontrada."}
        </p>
      ) : (
        <>
          <ul aria-label="Instalações confiáveis da conta" className="space-y-3 px-4">
            {devices.map((device) => (
              <li key={device.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {device.isCurrent ? "Esta instalação" : "Instalação do navegador ou aplicativo"}
                  </h3>
                  {device.isCurrent && (
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      Instalação atual
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Reconhecida em <time dateTime={device.firstSeenAt}>{formatDate(device.firstSeenAt)}</time>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Último acesso <time dateTime={device.lastSeenAt}>{formatDate(device.lastSeenAt)}</time>
                </p>
                <Button
                  type="button"
                  variant={device.isCurrent ? "destructive" : "outline"}
                  className="mt-4 min-h-11"
                  disabled={pendingAction !== null}
                  onClick={() => onRevokeDevice(device)}
                  aria-label={`Remover instalação reconhecida em ${formatDate(device.firstSeenAt)}`}
                >
                  {pendingAction === device.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {device.isCurrent ? "Remover esta instalação" : "Remover instalação"}
                </Button>
              </li>
            ))}
          </ul>
          {devicesHaveMore && (
            <p className="px-4 pt-3 text-xs text-muted-foreground">
              A lista mostra as 100 instalações mais recentes. Use a opção abaixo para revogar todas as outras, inclusive as mais antigas.
            </p>
          )}
          {devices.some((device) => !device.isCurrent) && (
            <div className="px-4 pt-4">
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full"
                disabled={pendingAction !== null}
                onClick={onRevokeOtherDevices}
              >
                {pendingAction === "other-devices" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Revogar todas as outras instalações
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
