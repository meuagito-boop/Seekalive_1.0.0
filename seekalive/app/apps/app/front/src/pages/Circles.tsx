import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, UserCheck, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";

export default function Circles() {
  const [query, setQuery] = useState("");
  const { currentUser } = useAppContext();
  const { users, toggleFollow } = useSocial();
  const acceptedList = users.filter(user => user.id !== currentUser?.id && !user.isBlocked && user.isInCircle);

  function removeFromCircle(id: string) {
    toggleFollow(id);
  }

  const filteredAccepted = acceptedList.filter(u =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Page header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => window.history.back()}
          className="text-muted-foreground hover:text-foreground shrink-0"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <div>
          <h1 className="font-bold text-base leading-tight">Meu Círculo</h1>
          <p className="text-xs text-muted-foreground">
            {acceptedList.length} {acceptedList.length === 1 ? "pessoa" : "pessoas"} que se seguem mutuamente
          </p>
        </div>
      </div>

      {/* Pessoas que se seguem mutuamente */}
          {/* Search */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar no seu Círculo"
                className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {filteredAccepted.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium">
                {query ? "Ninguém do Círculo encontrado" : "Seu Círculo está vazio"}
              </p>
              <p className="text-sm mt-1 opacity-70">
                {query ? `Sem resultado para "${query}"` : "O Círculo é formado automaticamente quando você e outra pessoa se seguem."}
              </p>
            </div>
          ) : (
            <div>
              {filteredAccepted.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  data-testid={`circle-${user.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
                >
                  <Avatar className="w-11 h-11 shrink-0">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio.slice(0, 60)}</p>
                  </div>
                  <button
                    onClick={() => removeFromCircle(user.id)}
                    data-testid={`button-remove-circle-${user.id}`}
                    className="shrink-0 px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                  >
                    Deixar de seguir
                  </button>
                </motion.div>
              ))}
            </div>
          )}
    </div>
  );
}
