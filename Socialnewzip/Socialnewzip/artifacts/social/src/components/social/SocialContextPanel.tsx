import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Star, Users, TrendingUp } from "lucide-react";
import { mockUsers } from "@/data/mockData";

const mockPlaces = [
  { id: 1, name: "Café Moderno", category: "Café", distance: "0.3 km", rating: 4.8, img: "https://picsum.photos/seed/place1/48/48" },
  { id: 2, name: "Galeria Norte", category: "Arte", distance: "1.1 km", rating: 4.6, img: "https://picsum.photos/seed/place2/48/48" },
  { id: 3, name: "Bar da Esquina", category: "Bar", distance: "0.8 km", rating: 4.5, img: "https://picsum.photos/seed/place3/48/48" },
];

const mockEvents = [
  { id: 1, name: "Show ao Vivo no Parque", date: "Sáb, 21 Jun", venue: "Parque da Cidade", attendees: 124 },
  { id: 2, name: "Feira de Artesanato Local", date: "Dom, 22 Jun", venue: "Praça Central", attendees: 87 },
];

const mockCommunities = [
  { id: "c1", name: "Fotografia Urbana", members: 3240, img: "https://picsum.photos/seed/comm1/40/40" },
  { id: "c2", name: "Tech & Startup SP", members: 8100, img: "https://picsum.photos/seed/comm2/40/40" },
];

const suggestUsers = mockUsers.filter(u => !u.isFollowing).slice(0, 3);

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
  return (
    <div className="w-full space-y-0">

      {/* Pessoas para seguir */}
      <PanelCard title="Pessoas para seguir" icon={<Users className="w-4 h-4" />}>
        {suggestUsers.map((user) => (
          <div key={user.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-xs font-bold">{user.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
            </div>
            <button className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              Seguir
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
        {mockPlaces.map((place) => (
          <div key={place.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer">
            <img src={place.img} alt={place.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{place.name}</p>
              <p className="text-[11px] text-muted-foreground">{place.category} · {place.distance}</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="w-3 h-3 text-warning fill-warning" />
              <span className="text-[11px] font-medium text-foreground">{place.rating}</span>
            </div>
          </div>
        ))}
      </PanelCard>

      {/* Eventos próximos */}
      <PanelCard title="Eventos próximos" icon={<Calendar className="w-4 h-4" />}>
        {mockEvents.map((event) => (
          <div key={event.id} className="px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer">
            <p className="text-xs font-semibold text-foreground">{event.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{event.date} · {event.venue}</p>
            <p className="text-[11px] text-primary mt-0.5">{event.attendees} interessados</p>
          </div>
        ))}
      </PanelCard>

      {/* Comunidades em destaque */}
      <PanelCard title="Comunidades em destaque" icon={<TrendingUp className="w-4 h-4" />}>
        {mockCommunities.map((c) => (
          <div key={c.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
            <img src={c.img} alt={c.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">{c.members.toLocaleString()} membros</p>
            </div>
            <button className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
              Entrar
            </button>
          </div>
        ))}
        <div className="px-4 py-2 border-t border-border">
          <Link href="/communities" className="text-xs text-primary hover:underline">
            Ver todas as comunidades
          </Link>
        </div>
      </PanelCard>

    </div>
  );
}
