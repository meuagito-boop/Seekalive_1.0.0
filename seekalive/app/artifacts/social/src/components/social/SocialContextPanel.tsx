import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Star, Users, TrendingUp } from "lucide-react";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { demoSeekEvents } from "@/data/demoSeekEvents";


function PanelCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SocialContextPanel() {
  const { users, reviews, toggleFollow } = useSocial();
  const { currentUser } = useAppContext();
  const suggestUsers = users.filter(u => u.id !== currentUser?.id && !u.isFollowing && !u.followRequestSent && !u.isBlocked).slice(0, 3);
  const places = users.filter(user => user.accountType === "commercial" && user.commercialProfile && !user.isBlocked).slice(0, 3);
  return (
    <div className="w-full space-y-0">

      {/* Pessoas para seguir */}
      <PanelCard title="Pessoas para seguir" icon={<Users className="w-4 h-4" />}>
        {suggestUsers.map((user) => (
          <div key={user.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={user.avatarUrl} alt="" />
              <AvatarFallback className="text-xs font-bold">{user.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
            </div>
            <button type="button" onClick={() => toggleFollow(user.id)} aria-label={`${user.isPrivate ? "Solicitar para seguir" : "Seguir"} ${user.displayName}`} className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              {user.isPrivate ? "Solicitar" : "Seguir"}
            </button>
          </div>
        ))}
        <div className="px-4 py-2 border-t border-border">
          <Link href="/social/suggestions" className="text-xs text-primary hover:underline">
            Ver mais sugestões
          </Link>
        </div>
      </PanelCard>

      {/* Lugares em alta */}
      <PanelCard title="Lugares em alta" icon={<MapPin className="w-4 h-4" />}>
        {places.map((place) => {
          const entries = reviews.filter(review => review.businessAccountId === place.id);
          const rating = entries.length ? entries.reduce((sum, review) => sum + review.rating, 0) / entries.length : undefined;
          return (
          <Link key={place.id} href={`/profile/${place.username}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30">
            <div aria-hidden="true" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 flex items-center justify-center bg-primary/10 text-xs font-bold text-primary">{place.displayName[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{place.displayName}</p>
              <p className="text-[11px] text-muted-foreground">{place.commercialProfile?.category}</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="w-3 h-3 text-warning fill-warning" />
              <span className="text-[11px] font-medium text-foreground">{rating === undefined ? "Sem avaliações" : rating.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
            </div>
          </Link>
        ); })}
      </PanelCard>

      {/* Eventos próximos */}
      <PanelCard title="Eventos próximos" icon={<Calendar className="w-4 h-4" />}>
        {demoSeekEvents.slice(0, 2).map((event) => (
          <Link key={event.id} href={`/seek/event/${event.id}`} className="block px-4 py-2.5 hover:bg-muted/30">
            <p className="text-xs font-semibold text-foreground">{event.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{event.date} · {event.venue}</p>
            <p className="text-[11px] text-primary mt-0.5">{event.interested} interessados</p>
          </Link>
        ))}
      </PanelCard>

    </div>
  );
}
