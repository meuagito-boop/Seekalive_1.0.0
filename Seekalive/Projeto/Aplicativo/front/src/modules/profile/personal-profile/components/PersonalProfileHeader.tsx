import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Check, Globe, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/modules/shared/utils/formatters";
import { ProfileActionsMenu } from "@/modules/profile/personal-profile/components/ProfileActionsMenu";
import type { User } from "@/modules/profile/types/user";

interface PersonalProfileHeaderProps {
  user: User;
  isMe: boolean;
  postCount: number;
  inCircle: boolean;
  following: boolean;
  followRequested: boolean;
  circleCount: number;
  onBack: () => void;
  onFollow: () => void;
  onBlockToggle: () => Promise<boolean>;
}

export function PersonalProfileHeader({
  user,
  isMe,
  postCount,
  inCircle,
  following,
  followRequested,
  circleCount,
  onBack,
  onFollow,
  onBlockToggle,
}: PersonalProfileHeaderProps) {
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="p-1 text-muted-foreground hover:text-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">{formatCount(postCount)} {postCount === 1 ? "publicação" : "publicações"}</p>
        </div>
      </div>

      <div className="relative">
        <div className="h-36 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-background md:h-48">
          {user.coverUrl && (
            <img src={user.coverUrl} alt={`Capa de ${user.displayName}`} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="px-4">
          <div className="-mt-12 mb-3 flex flex-wrap items-end justify-between gap-2">
            <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/30">
              <AvatarImage src={user.avatarUrl} alt={`Foto de ${user.displayName}`} />
              <AvatarFallback className="text-2xl">{user.displayName[0]}</AvatarFallback>
            </Avatar>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {isMe ? (
                <Button asChild variant="outline" className="h-9 rounded-full border-border px-5 text-sm font-semibold" data-testid="button-edit-profile">
                  <Link href="/profile/edit">Editar perfil</Link>
                </Button>
              ) : (
                <>
                  {inCircle && (
                    <span className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground" data-testid="badge-mutual-circle">
                      <Check className="h-3 w-3" /> No Círculo
                    </span>
                  )}

                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onFollow}
                      variant={following || followRequested ? "outline" : "default"}
                      className="h-9 rounded-full px-5 text-sm font-semibold"
                      data-testid="button-follow"
                    >
                      {following ? "Seguindo" : followRequested ? "Cancelar solicitação" : user.isPrivate ? "Solicitar para seguir" : "Seguir"}
                    </Button>
                  </motion.div>

                  <ProfileActionsMenu user={user} onBlockToggle={onBlockToggle} />
                </>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 break-words text-xl font-bold">{user.displayName}</h1>
            </div>
            <p className="break-all text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{user.bio}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {user.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{user.location}</span>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1 break-all text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5" />{user.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Entrou em {new Date(user.joinedAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="mb-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href={`/profile/${user.username}/following`} className="hover:underline" data-testid="link-following">
              <span className="font-bold">{formatCount(user.stats.following)}</span>
              <span className="ml-1 text-muted-foreground">Seguindo</span>
            </Link>
            <Link href={`/profile/${user.username}/followers`} className="hover:underline" data-testid="link-followers">
              <span className="font-bold">{formatCount(user.stats.followers)}</span>
              <span className="ml-1 text-muted-foreground">Seguidores</span>
            </Link>
            {isMe ? (
              <Link href={`/profile/${user.username}/circles`} className="hover:underline" data-testid="link-circles">
                <span className="font-bold">{formatCount(circleCount)}</span>
                <span className="ml-1 text-muted-foreground">Círculo</span>
              </Link>
            ) : (
              <span className="text-muted-foreground" data-testid="stat-circles">
                <span className="font-bold text-foreground">{formatCount(circleCount)}</span>
                <span className="ml-1">Círculo</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
