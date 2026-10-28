import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  Calendar,
  Check,
  Globe,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/formatters";
import type { User } from "@/modules/profile/types/user";

type PersonalProfileHeaderProps = {
  circleCount: number;
  following: boolean;
  followRequested: boolean;
  inCircle: boolean;
  isMe: boolean;
  onBack: () => void;
  onBlockToggle: () => Promise<boolean>;
  onCopyProfileLink: () => void;
  onFollow: () => void;
  profile: User;
  publicationCount: number;
};

export function PersonalProfileHeader({
  circleCount,
  following,
  followRequested,
  inCircle,
  isMe,
  onBack,
  onBlockToggle,
  onCopyProfileLink,
  onFollow,
  profile,
  publicationCount,
}: PersonalProfileHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

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
          <p className="truncate text-base font-bold leading-tight">
            {profile.displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCount(publicationCount)}{" "}
            {publicationCount === 1 ? "publicação" : "publicações"}
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="h-36 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-background md:h-48">
          {profile.coverUrl && (
            <img
              src={profile.coverUrl}
              alt={`Capa de ${profile.displayName}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="px-4">
          <div className="-mt-12 mb-3 flex flex-wrap items-end justify-between gap-2">
            <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/30">
              <AvatarImage
                src={profile.avatarUrl}
                alt={`Foto de ${profile.displayName}`}
              />
              <AvatarFallback className="text-2xl">
                {profile.displayName[0]}
              </AvatarFallback>
            </Avatar>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {isMe ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-9 rounded-full border-border px-5 text-sm font-semibold"
                  data-testid="button-edit-profile"
                >
                  <Link href="/profile/edit">Editar perfil</Link>
                </Button>
              ) : (
                <>
                  {inCircle && (
                    <span
                      className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground"
                      data-testid="badge-mutual-circle"
                    >
                      <Check className="h-3 w-3" /> No Círculo
                    </span>
                  )}

                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onFollow}
                      variant={
                        following || followRequested ? "outline" : "default"
                      }
                      className="h-9 rounded-full px-5 text-sm font-semibold"
                      data-testid="button-follow"
                    >
                      {following
                        ? "Seguindo"
                        : followRequested
                          ? "Cancelar solicitação"
                          : profile.isPrivate
                            ? "Solicitar para seguir"
                            : "Seguir"}
                    </Button>
                  </motion.div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMenu((value) => !value)}
                      aria-label="Mais opções do perfil"
                      aria-expanded={showMenu}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted/50"
                      data-testid="button-more"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                        >
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="w-full cursor-not-allowed px-4 py-3 text-left text-sm text-muted-foreground"
                            data-testid="action-silenciar"
                          >
                            Silenciar
                            <span className="block text-[11px]">
                              Indisponível nesta versão
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void onBlockToggle().then((updated) => {
                                if (updated) setShowMenu(false);
                              });
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/50"
                            data-testid="action-bloquear"
                          >
                            {profile.isBlockedByViewer
                              ? "Desbloquear"
                              : "Bloquear"}
                          </button>
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="w-full cursor-not-allowed px-4 py-3 text-left text-sm text-muted-foreground"
                            data-testid="action-denunciar"
                          >
                            Denunciar
                            <span className="block text-[11px]">
                              Indisponível nesta versão
                            </span>
                          </button>
                          <button
                            type="button"
                            className="w-full px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted/50"
                            onClick={() => {
                              setShowMenu(false);
                              onCopyProfileLink();
                            }}
                            data-testid="action-compartilhar-perfil"
                          >
                            Copiar link do perfil
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 break-words text-xl font-bold">
                {profile.displayName}
              </h1>
            </div>
            <p className="break-all text-sm text-muted-foreground">
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {profile.bio}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-1 break-all text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Entrou em{" "}
                {new Date(profile.joinedAt).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="mb-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link
              href={`/profile/${profile.username}/following`}
              className="hover:underline"
              data-testid="link-following"
            >
              <span className="font-bold">
                {formatCount(profile.stats.following)}
              </span>
              <span className="ml-1 text-muted-foreground">Seguindo</span>
            </Link>
            <Link
              href={`/profile/${profile.username}/followers`}
              className="hover:underline"
              data-testid="link-followers"
            >
              <span className="font-bold">
                {formatCount(profile.stats.followers)}
              </span>
              <span className="ml-1 text-muted-foreground">Seguidores</span>
            </Link>
            {isMe ? (
              <Link
                href={`/profile/${profile.username}/circles`}
                className="hover:underline"
                data-testid="link-circles"
              >
                <span className="font-bold">{formatCount(circleCount)}</span>
                <span className="ml-1 text-muted-foreground">Círculo</span>
              </Link>
            ) : (
              <span
                className="text-muted-foreground"
                data-testid="stat-circles"
              >
                <span className="font-bold text-foreground">
                  {formatCount(circleCount)}
                </span>
                <span className="ml-1">Círculo</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
