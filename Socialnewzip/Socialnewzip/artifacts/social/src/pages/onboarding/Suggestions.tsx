import { BrandMark } from "@/components/brand/BrandMark";
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { mockUsers } from "@/data/mockData";

export default function OnboardingSuggestions() {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  function toggle(userId: string) {
    setFollowed(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-5 py-10 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-primary/[0.06] blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-xl rounded-[1.75rem] border border-border bg-card/75 p-6 shadow-2xl shadow-black/15 backdrop-blur-sm sm:p-9"
      >
        <div className="flex items-center gap-2 mb-10">
          <BrandMark />
          <span className="text-xl font-bold tracking-tight">Seekalive</span>
        </div>

        <div className="mb-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Perfis sugeridos</p>
          <div className="flex gap-2 mb-6">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className="h-1 flex-1 rounded-full bg-primary" />
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">Encontre sua gente</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">
          Algumas pessoas para começar. Você sempre pode descobrir mais depois.
        </p>

        <div className="space-y-3 mb-8">
          {mockUsers.slice(0, 6).map((user, i) => {
            const isFollowed = followed.has(user.id);
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border"
              >
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback aria-label={`Foto de ${user.displayName}`}>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.displayName}</p>
                  <p className="text-muted-foreground text-xs truncate">@{user.username}</p>
                  <p className="text-muted-foreground text-xs truncate mt-0.5">{user.bio.slice(0, 60)}...</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(user.id)}
                  aria-pressed={isFollowed}
                  aria-label={`${isFollowed ? "Deixar de seguir" : "Seguir"} ${user.displayName}`}
                  data-testid={`button-follow-${user.id}`}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isFollowed
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isFollowed && <Check className="w-3 h-3" />}
                  {isFollowed ? "Seguindo" : "Seguir"}
                </button>
              </motion.div>
            );
          })}
        </div>

        <Button
          className="w-full h-12 rounded-xl font-semibold"
          onClick={() => setLocation("/feed")}
          data-testid="button-finish-onboarding"
        >
          {followed.size > 0 ? `Seguir ${followed.size} e concluir` : "Concluir e entrar"}
        </Button>

        <button
          className="w-full text-center mt-4 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/feed")}
          data-testid="button-skip-suggestions"
        >
          Pular por agora
        </button>
      </motion.div>
    </div>
  );
}
