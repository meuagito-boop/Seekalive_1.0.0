import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Edit, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/layout/Header";
import { formatTimeAgo } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";

export default function Messages() {
  const { conversations, getUserById, unreadMessages } = useSocial();
  const [query, setQuery] = useState("");
  const { currentUser } = useAppContext();
  const myId = currentUser?.id;

  const filtered = conversations.filter(conv => {
    if (!myId || !conv.participantIds.includes(myId)) return false;
    const otherId = conv.participantIds.find(id => id !== myId);
    const user = getUserById(otherId ?? "");
    if (!user) return false;
    return (
      user.displayName.toLowerCase().includes(query.toLowerCase()) ||
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-bold text-xl flex items-center gap-2">
            Mensagens
            {unreadMessages > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold leading-none">
                {unreadMessages}
              </span>
            )}
          </h1>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            data-testid="button-new-message"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar conversas"
              data-testid="input-search-messages"
              className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Mail className="w-12 h-12 mb-4 opacity-30" />
          <p className="font-medium">Nenhuma conversa</p>
          <p className="text-sm mt-1 opacity-70">Conversas das quais você participa aparecem aqui.</p>
        </div>
      ) : (
        <div>
          {filtered.map((conv, i) => {
            const otherId = conv.participantIds.find(id => id !== myId) ?? "";
            const other = getUserById(otherId);
            if (!other) return null;
            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/messages/${conv.id}`}
                  data-testid={`conversation-${conv.id}`}
                  className={`flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-muted/20 transition-colors ${
                    conv.unreadCount > 0 ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={other.avatarUrl} />
                      <AvatarFallback>{other.displayName[0]}</AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-sm ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {other.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {conv.lastMessage ? formatTimeAgo(conv.lastMessage.createdAt) : ""}
                      </span>
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.lastMessage?.senderId === myId ? "Você: " : ""}
                      {conv.lastMessage?.content ?? ""}
                    </p>
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
