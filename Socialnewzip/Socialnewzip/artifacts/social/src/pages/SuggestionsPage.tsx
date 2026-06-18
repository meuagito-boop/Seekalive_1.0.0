import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Users, Hash, LayoutGrid, Store, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { mockUsers } from "@/data/mockData";
import { useLocation } from "wouter";

const suggestPeople = mockUsers.filter(u => !u.isFollowing);
const suggestTopics = [
  { id: 1, name: "Fotografia", posts: "12.4K posts", color: "bg-blue-500/10 text-blue-400" },
  { id: 2, name: "Tech & IA", posts: "34.1K posts", color: "bg-purple-500/10 text-purple-400" },
  { id: 3, name: "Gastronomia", posts: "8.7K posts", color: "bg-orange-500/10 text-orange-400" },
  { id: 4, name: "Arte Urbana", posts: "5.2K posts", color: "bg-pink-500/10 text-pink-400" },
  { id: 5, name: "Sustentabilidade", posts: "9.8K posts", color: "bg-green-500/10 text-green-400" },
  { id: 6, name: "Música", posts: "22.0K posts", color: "bg-yellow-500/10 text-yellow-400" },
];
const suggestCommunities = [
  { id: "c1", name: "Fotografia Urbana SP", members: 3240, category: "Arte" },
  { id: "c2", name: "Tech Talks Brasil", members: 8100, category: "Tecnologia" },
  { id: "c3", name: "Rolê Gastronômico", members: 1890, category: "Gastronomia" },
];
const suggestBusinesses = [
  { id: "b1", name: "Café Moderno", category: "Café & Brunch", rating: 4.8, img: "https://picsum.photos/seed/biz1/40/40" },
  { id: "b2", name: "Studio Ink", category: "Arte & Design", rating: 4.7, img: "https://picsum.photos/seed/biz2/40/40" },
  { id: "b3", name: "Feira Natural", category: "Alimentação", rating: 4.6, img: "https://picsum.photos/seed/biz3/40/40" },
];

export default function SuggestionsPage() {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [followedTopics, setFollowedTopics] = useState<Set<number>>(new Set());
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header title="Sugestões" />

      <div className="sticky top-14 md:top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-4 h-12">
          <button
            onClick={() => navigate(-1 as never)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-base text-foreground">Seguir</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Pessoas, tópicos e comunidades</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList className="w-full overflow-x-auto flex-nowrap scrollbar-none px-2">
          <TabsTrigger value="people" className="flex-shrink-0 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            Pessoas
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex-shrink-0 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Tópicos
          </TabsTrigger>
          <TabsTrigger value="communities" className="flex-shrink-0 flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            Comunidades
          </TabsTrigger>
          <TabsTrigger value="business" className="flex-shrink-0 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            Comércios
          </TabsTrigger>
        </TabsList>

        {/* Pessoas */}
        <TabsContent value="people">
          {suggestPeople.map((user, i) => {
            const isFollowing = followed.has(user.id);
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
              >
                <Avatar className="w-11 h-11 flex-shrink-0">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className="font-bold">{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 line-clamp-1">{user.bio}</p>
                </div>
                <button
                  onClick={() => setFollowed(prev => {
                    const next = new Set(prev);
                    if (next.has(user.id)) next.delete(user.id); else next.add(user.id);
                    return next;
                  })}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isFollowing
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isFollowing ? "Seguindo" : "Seguir"}
                </button>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* Tópicos */}
        <TabsContent value="topics">
          <div className="p-4 grid grid-cols-2 gap-3">
            {suggestTopics.map((topic, i) => {
              const following = followedTopics.has(topic.id);
              return (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${topic.color}`}>
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{topic.name}</p>
                    <p className="text-[11px] text-muted-foreground">{topic.posts}</p>
                  </div>
                  <button
                    onClick={() => setFollowedTopics(prev => {
                      const next = new Set(prev);
                      if (next.has(topic.id)) next.delete(topic.id); else next.add(topic.id);
                      return next;
                    })}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      following
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {following ? "Seguindo" : "Seguir"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Comunidades */}
        <TabsContent value="communities">
          {suggestCommunities.map((c, i) => {
            const joined = joinedCommunities.has(c.id);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.members.toLocaleString()} membros · {c.category}</p>
                </div>
                <button
                  onClick={() => setJoinedCommunities(prev => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                    return next;
                  })}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    joined
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {joined ? "Membro" : "Entrar"}
                </button>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* Comércios */}
        <TabsContent value="business">
          {suggestBusinesses.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <img src={b.img} alt={b.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.category}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-warning">★</span>
                  <span className="text-[11px] text-foreground font-medium">{b.rating}</span>
                </div>
              </div>
              <button className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                Seguir
              </button>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
