import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Users, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { mockCommunities, formatCount } from "@/data/mockData";

const tabs = ["Descobrir", "Minhas Comunidades"];
const categories = ["Todas", "Design", "Tecnologia", "Fotografia", "Música", "Ciência", "Escrita"];

export default function Communities() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [joined, setJoined] = useState<Set<string>>(new Set(mockCommunities.filter(c => c.isJoined).map(c => c.id)));

  const filtered = mockCommunities.filter(c => {
    const matchQuery = c.name.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase());
    const matchCategory = activeCategory === "Todas" || c.category === activeCategory;
    if (activeTab === 1) return joined.has(c.id) && matchQuery;
    return matchQuery && matchCategory;
  });

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-bold text-xl">Comunidades</h1>
          <Link href="/communities/create">
            <Button size="sm" className="rounded-full h-8 px-4 text-sm gap-1" data-testid="button-create-community">
              <Plus className="w-4 h-4" /> Criar
            </Button>
          </Link>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar comunidades"
              data-testid="input-search"
              className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="flex border-b border-border">
          {tabs.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} data-testid={`tab-${i}`}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 0 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} data-testid={`category-${cat}`}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mb-4 opacity-30" />
          <p className="font-medium">Nenhuma comunidade encontrada</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((community, i) => {
            const isJoined = joined.has(community.id);
            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`community-${community.id}`}
              >
                <Link href={`/communities/${community.id}`} className="block hover:bg-muted/20 transition-colors">
                  <div className="h-24 bg-gradient-to-br from-primary/20 via-accent/10 to-background relative overflow-hidden">
                    {community.bannerUrl && (
                      <img src={community.bannerUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3 -mt-7">
                      <Avatar className="w-14 h-14 border-4 border-background shrink-0">
                        <AvatarImage src={community.iconUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">{community.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 mt-7">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-base truncate">{community.name}</p>
                            <p className="text-xs text-muted-foreground">{community.category} · {formatCount(community.memberCount)} membros</p>
                          </div>
                          <button
                            onClick={e => {
                              e.preventDefault();
                              setJoined(prev => {
                                const next = new Set(prev);
                                if (next.has(community.id)) next.delete(community.id); else next.add(community.id);
                                return next;
                              });
                            }}
                            data-testid={`button-join-${community.id}`}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${isJoined ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground"}`}
                          >
                            {isJoined ? "Participando" : "Entrar"}
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{community.description}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
