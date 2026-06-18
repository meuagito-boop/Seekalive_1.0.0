import { useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockUsers } from "@/data/mockData";

export default function Following() {
  const params = useParams<{ username: string }>();
  const [query, setQuery] = useState("");
  const [following, setFollowing] = useState<Set<string>>(new Set(mockUsers.filter(u => u.isFollowing).map(u => u.id)));

  const filtered = mockUsers.filter(u =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3 px-4 h-14">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-base">@{params.username}</h1>
          <p className="text-xs text-muted-foreground">Seguindo</p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar"
            data-testid="input-search"
            className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum resultado</p>
        </div>
      ) : (
        <div>
          {filtered.map((user, i) => {
            const isFollowing = following.has(user.id);
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                data-testid={`user-card-${user.id}`}
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
                  onClick={() => setFollowing(prev => {
                    const next = new Set(prev);
                    if (next.has(user.id)) next.delete(user.id); else next.add(user.id);
                    return next;
                  })}
                  data-testid={`button-follow-${user.id}`}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isFollowing ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isFollowing ? "Seguindo" : "Seguir"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
