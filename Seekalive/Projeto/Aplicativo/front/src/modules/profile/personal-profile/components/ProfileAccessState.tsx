import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UnavailableState } from "@/components/content/StateBlocks";
import type { User } from "@/modules/profile/types/user";

interface ProfileAccessStateProps {
  user: User;
  isMe: boolean;
  following: boolean;
  followRequested: boolean;
  onFollow: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}

export function ProfileAccessState({
  user,
  isMe,
  following,
  followRequested,
  onFollow,
  onBlock,
  onUnblock,
}: ProfileAccessStateProps) {
  if (!isMe && user.isBlocked) {
    const blockedByViewer = Boolean(user.isBlockedByViewer);
    const mutualBlock = blockedByViewer && Boolean(user.blocksViewer);
    return (
      <UnavailableState
        title={mutualBlock ? "Bloqueio mútuo" : blockedByViewer ? "Perfil bloqueado" : "Perfil indisponível"}
        description={mutualBlock
          ? "Você bloqueou esta conta e ela também bloqueou você. Remover o seu bloqueio não remove o bloqueio iniciado pela outra conta."
          : blockedByViewer
            ? "Você bloqueou este perfil. Perfis, conteúdos e interações entre vocês estão indisponíveis para ambos."
            : "Esta conta bloqueou o seu perfil. Perfis, conteúdos e interações entre vocês estão indisponíveis."}
        action={blockedByViewer
          ? <Button variant="outline" onClick={onUnblock}>{mutualBlock ? "Remover meu bloqueio" : "Desbloquear perfil"}</Button>
          : undefined}
      />
    );
  }

  if (!isMe && user.isPrivate && !following) {
    return (
      <div className="min-h-[70vh] px-5 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <Avatar className="mx-auto mb-4 h-16 w-16">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold">{user.displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {followRequested
              ? "Sua solicitação está aguardando aprovação. O conteúdo ficará visível depois que o dono aceitar."
              : "Este perfil é privado. Envie uma solicitação para seguir; as publicações públicas do perfil ficam visíveis após a aprovação."}
          </p>
          <Button onClick={onFollow} className="mt-5 rounded-full" variant={followRequested ? "outline" : "default"}>
            {followRequested ? "Cancelar solicitação" : "Solicitar para seguir"}
          </Button>
          <Button
            variant="outline"
            className="mt-2 rounded-full"
            onClick={onBlock}
            data-testid="button-block-private-profile"
          >
            Bloquear perfil
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
