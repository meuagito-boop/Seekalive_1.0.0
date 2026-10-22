import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { UnavailableState } from "@/components/content/StateBlocks";

export function ConnectionList({ kind }: { kind: "followers" | "following" }) {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const { users, toggleFollow } = useSocial();
  const { currentUser } = useAppContext();
  const label = kind === "followers" ? "Seguidores" : "Seguindo";

  const isMe = !!currentUser && params.username === currentUser.username;
  const owner = isMe ? currentUser : users.find(u => u.username === params.username);

  if (!owner) {
    return (
      <UnavailableState
        title="Perfil indisponível"
        description={`Não encontramos @${params.username}. A conta pode ter sido removida.`}
        action={<Link href="/feed" className="text-sm font-semibold text-primary hover:underline">Voltar ao feed</Link>}
      />
    );
  }

  // Só "Seguindo" do próprio usuário tem estado real no frontend; demais listas ficam indisponíveis.
  const available = kind === "following" && isMe;
  const base = available ? users.filter(u => u.id !== owner.id && !u.isBlocked && u.isFollowing) : [];
  const q = query.trim().toLowerCase();
  const filtered = base.filter(u => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3 px-4 h-14">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => (window.history.length > 1 ? window.history.back() : setLocation(`/profile/${owner.username}`))}
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-bold text-base">{owner.displayName}</h1>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>

      {!available ? (
        <UnavailableState
          title="Conexões indisponíveis"
          description="Esta lista ainda não está disponível."
          action={<Link href={`/profile/${owner.username}`} className="text-sm font-semibold text-primary hover:underline">Voltar ao perfil</Link>}
        />
      ) : (
      <>

      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar em quem você segue"
            aria-label="Buscar em quem você segue"
            data-testid="input-search"
            className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center text-muted-foreground">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">
            {q ? "Nenhuma conta encontrada para essa busca." : "Você ainda não segue nenhuma conta."}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              data-testid={`user-card-${user.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <Link href={`/profile/${user.username}`} aria-label={`Ver perfil de ${user.displayName}`} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={user.avatarUrl} alt="" />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-foreground">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  {user.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>}
                </div>
              </Link>
              {user.id !== currentUser?.id && (
                <button
                  type="button"
                  onClick={() => toggleFollow(user.id)}
                  data-testid={`button-follow-${user.id}`}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    user.isFollowing ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {user.isFollowing ? "Seguindo" : "Seguir"}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
