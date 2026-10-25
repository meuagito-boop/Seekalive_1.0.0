import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionTitle } from "@/modules/settings/screens/SettingsSubheader";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { User } from "@/modules/profile/types/user";

interface FollowRequestsSectionProps {
  requests: FollowRequest[];
  getUserById: (id: string) => User | undefined;
  isLoading: boolean;
  isWorking: (requestId: string) => boolean;
  error: string | null;
  onRetry: () => void;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

export function FollowRequestsSection({
  requests,
  getUserById,
  isLoading,
  isWorking,
  error,
  onRetry,
  onAccept,
  onDecline,
}: FollowRequestsSectionProps) {
  return (
    <>
      <SectionTitle>Solicitações para seguir ({requests.length})</SectionTitle>
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm text-destructive">
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={onRetry} disabled={isLoading}>
            {isLoading ? "Tentando…" : "Tentar novamente"}
          </button>
        </p>
      )}
      {isLoading && requests.length === 0 ? (
        <p role="status" className="px-4 pb-4 text-sm text-muted-foreground">Carregando solicitações…</p>
      ) : requests.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Você não tem solicitações pendentes.</p>
      ) : (
        <div className="divide-y divide-border border-y border-border bg-card">
          {requests.map((request) => {
            const requester = getUserById(request.requesterId);
            const pending = isWorking(request.id);
            return (
              <div key={request.id} className="flex items-center gap-3 px-4 py-3" data-testid={`follow-request-${request.id}`}>
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={requester?.avatarUrl} alt="" />
                  <AvatarFallback>{requester?.displayName?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{requester?.displayName ?? "Conta indisponível"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {requester ? `@${requester.username} quer seguir você` : "Esta conta não está disponível no protótipo."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending || isLoading}
                  onClick={() => onAccept(request.id)}
                  aria-label={`Aceitar solicitação de ${requester?.displayName ?? "conta"}`}
                  data-testid={`accept-follow-request-${request.id}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pending || isLoading}
                  onClick={() => onDecline(request.id)}
                  aria-label={`Recusar solicitação de ${requester?.displayName ?? "conta"}`}
                  data-testid={`decline-follow-request-${request.id}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
