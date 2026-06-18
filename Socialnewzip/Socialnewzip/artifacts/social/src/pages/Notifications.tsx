import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, Repeat2, UserPlus, Users, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/layout/Header";
import { formatTimeAgo } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";
import type { Notification } from "@/data/mockData";

const tabs = ["Todas", "Menções", "Amigos", "Reações"];

function notifIcon(type: Notification["type"]) {
  switch (type) {
    case "like": return <Heart className="w-3.5 h-3.5 text-red-400" />;
    case "comment": return <MessageCircle className="w-3.5 h-3.5 text-blue-400" />;
    case "repost": return <Repeat2 className="w-3.5 h-3.5 text-green-400" />;
    case "follow": return <UserPlus className="w-3.5 h-3.5 text-primary" />;
    case "circle_request":
    case "circle_accepted": return <Users className="w-3.5 h-3.5 text-purple-400" />;
    case "mention": return <AtSign className="w-3.5 h-3.5 text-yellow-400" />;
    case "community_invite": return <Bell className="w-3.5 h-3.5 text-orange-400" />;
    default: return <Bell className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function notifText(n: Notification, actorName: string): string {
  switch (n.type) {
    case "like": return "curtiu seu post";
    case "comment": return "comentou no seu post";
    case "repost": return "repostou seu post";
    case "follow": return "começou a te seguir";
    case "circle_request": return "quer ser seu amigo";
    case "circle_accepted": return "aceitou sua solicitação de amizade";
    case "mention": return "te mencionou";
    case "community_invite": return "te convidou para uma comunidade";
    default: return "interagiu com você";
  }
}

export default function Notifications() {
  const {
    notifications, getUserById,
    markAllNotificationsRead, markNotificationRead,
    acceptCircleNotification, declineCircleNotification,
  } = useSocial();
  const [activeTab, setActiveTab] = useState(0);

  // Auto-mark all as read when page is visited (after a short delay for UX)
  useEffect(() => {
    const t = setTimeout(() => markAllNotificationsRead(), 3000);
    return () => clearTimeout(t);
  }, []);

  const filtered = notifications.filter(n => {
    if (activeTab === 0) return true;
    if (activeTab === 1) return n.type === "mention";
    if (activeTab === 2) return n.type === "circle_request" || n.type === "circle_accepted";
    if (activeTab === 3) return n.type === "like" || n.type === "repost";
    return true;
  });

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <Header title="Notificações" />

      <div className="sticky top-14 md:top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-end px-4 py-2 min-h-[36px]">
          {unread > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-primary hover:underline"
              data-testid="button-mark-all-read"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="flex">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              data-testid={`tab-notif-${tab}`}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium">Nenhuma notificação</p>
            <p className="text-sm mt-1 opacity-70">Quando algo acontecer, aparecerá aqui.</p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const actor = getUserById(n.actorId);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => markNotificationRead(n.id)}
                data-testid={`notification-${n.id}`}
                className={`flex items-start gap-3 px-4 py-4 border-b border-border hover:bg-muted/20 transition-colors cursor-pointer ${
                  !n.isRead ? "bg-primary/5" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={actor?.avatarUrl} />
                    <AvatarFallback>{actor?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-background rounded-full flex items-center justify-center border border-border shadow-sm">
                    {notifIcon(n.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{actor?.displayName}</span>{" "}
                    <span className="text-muted-foreground">{notifText(n, actor?.displayName ?? "")}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(n.createdAt)}</p>

                  {n.type === "circle_request" && (
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); acceptCircleNotification(n.actorId, n.id); }}
                        className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                        data-testid={`button-accept-circle-${n.id}`}
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); declineCircleNotification(n.actorId, n.id); }}
                        className="px-4 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                        data-testid={`button-decline-circle-${n.id}`}
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>

                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
