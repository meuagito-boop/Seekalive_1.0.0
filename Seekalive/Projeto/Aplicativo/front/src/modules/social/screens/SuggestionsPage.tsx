import { motion } from "framer-motion";
import { UserPlus, Hash, Store, ArrowLeft, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { Link, useLocation } from "wouter";

const demoSuggestTopics = [
  { id: 1, name: "Fotografia", posts: "12,4 mil publicações", color: "bg-blue-500/10 text-blue-400" },
  { id: 2, name: "Tech & IA", posts: "34,1 mil publicações", color: "bg-purple-500/10 text-purple-400" },
  { id: 3, name: "Gastronomia", posts: "8,7 mil publicações", color: "bg-orange-500/10 text-orange-400" },
  { id: 4, name: "Arte Urbana", posts: "5,2 mil publicações", color: "bg-pink-500/10 text-pink-400" },
  { id: 5, name: "Sustentabilidade", posts: "9,8 mil publicações", color: "bg-green-500/10 text-green-400" },
  { id: 6, name: "Música", posts: "22 mil publicações", color: "bg-yellow-500/10 text-yellow-400" },
];
export default function SuggestionsPage() {
  const { users, reviews, toggleFollow } = useSocial();
  const { currentUser } = useAppContext();
  const availableUsers = users.filter(user => user.id !== currentUser?.id && !user.isBlocked);
  const suggestPeople = availableUsers.filter(user => user.accountType !== "commercial");
  const suggestBusinesses = availableUsers.filter(user => user.accountType === "commercial" && user.commercialProfile);
  const suggestTopics = import.meta.env.DEV ? demoSuggestTopics : [];
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] pb-20 md:pb-0">
      <h1 className="px-4 pt-5 pb-2 sk-text-page-title">Sugestões</h1>

      <div className="sticky top-14 z-20 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-4 h-12">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/feed"))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-base text-foreground">Seguir</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Pessoas, tópicos e comércios</p>
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
          <TabsTrigger value="business" className="flex-shrink-0 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            Comércios
          </TabsTrigger>
        </TabsList>

        {/* Pessoas */}
        <TabsContent value="people">
          {suggestPeople.length === 0
            ? <p className="m-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Sugestões de pessoas aparecerão quando houver contas disponíveis.</p>
            : suggestPeople.map((user, i) => {
            const isFollowing = user.isFollowing ?? false;
            const followPending = user.followRequestSent ?? false;
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
                  <Link href={`/profile/${user.username}`} className="block font-semibold text-sm text-foreground truncate hover:underline">{user.displayName}</Link>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 line-clamp-1">{user.bio}</p>
                </div>
                <button
                  type="button"
                  aria-label={`${isFollowing ? "Deixar de seguir" : followPending ? "Cancelar solicitação para seguir" : user.isPrivate ? "Solicitar para seguir" : "Seguir"} ${user.displayName}`}
                  onClick={() => toggleFollow(user.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isFollowing || followPending
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isFollowing ? "Seguindo" : followPending ? "Cancelar" : user.isPrivate ? "Solicitar" : "Seguir"}
                </button>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* Tópicos */}
        <TabsContent value="topics">
          {suggestTopics.length === 0
            ? <p className="m-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Sugestões de tópicos aparecerão quando houver dados reais.</p>
            : <div className="p-4 grid grid-cols-2 gap-3">
            {suggestTopics.map((topic, i) => {
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
                  <Link
                    href={`/search?q=${encodeURIComponent(topic.name)}`}
                    className="w-full py-1.5 rounded-lg text-center text-xs font-semibold transition-all bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    Ver publicações
                  </Link>
                </motion.div>
              );
            })}
          </div>}
        </TabsContent>

        {/* Comércios */}
        <TabsContent value="business">
          {suggestBusinesses.length === 0
            ? <p className="m-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Comércios sugeridos aparecerão quando houver contas comerciais disponíveis.</p>
            : suggestBusinesses.map((b, i) => {
            const businessReviews = reviews.filter(review => review.businessAccountId === b.id);
            const rating = businessReviews.length ? businessReviews.reduce((sum, review) => sum + review.rating, 0) / businessReviews.length : undefined;
            return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <img src={b.avatarUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${b.username}`} className="font-semibold text-sm text-foreground hover:underline">{b.displayName}</Link>
                <p className="text-xs text-muted-foreground">{b.commercialProfile?.category}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 text-warning" aria-hidden />
                  <span className="text-[11px] text-foreground font-medium">{rating === undefined ? "Sem avaliações" : rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                </div>
              </div>
              <button type="button" onClick={() => toggleFollow(b.id)} aria-label={`${b.isFollowing ? "Deixar de seguir" : b.followRequestSent ? "Cancelar solicitação para seguir" : b.isPrivate ? "Solicitar para seguir" : "Seguir"} ${b.displayName}`} className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                {b.isFollowing ? "Seguindo" : b.followRequestSent ? "Cancelar" : b.isPrivate ? "Solicitar" : "Seguir"}
              </button>
            </motion.div>
          ); })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
