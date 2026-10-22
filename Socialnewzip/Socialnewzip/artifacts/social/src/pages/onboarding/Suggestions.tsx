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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-10">
          <BrandMark />
          <span className="text-xl font-bold tracking-tight">Seekalive</span>
        </div>

        <div className="mb-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Passo 2 de 2</p>
          <div className="flex gap-2 mb-6">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className="h-1 flex-1 rounded-full bg-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Quem seguir?</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Sugestões baseadas nos seus interesses.
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
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.displayName}</p>
                  <p className="text-muted-foreground text-xs truncate">@{user.username}</p>
                  <p className="text-muted-foreground text-xs truncate mt-0.5">{user.bio.slice(0, 60)}...</p>
                </div>
                <button
                  onClick={() => toggle(user.id)}
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
          {followed.size > 0 ? `Seguir ${followed.size} e entrar` : "Entrar no Seekalive"}
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
