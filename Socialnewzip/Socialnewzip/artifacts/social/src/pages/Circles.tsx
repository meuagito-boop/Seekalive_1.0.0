import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Check, X, Clock, Search, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockUsers } from "@/data/mockData";

const tabs = ["Amigos", "Solicitações", "Enviadas"];

const accepted = mockUsers.filter(u => u.circleStatus === "accepted");
const requests = mockUsers.filter(u => u.circleStatus === "pending").slice(0, 2);
const sent = mockUsers.filter(u => !u.isInCircle && !u.isFollowing).slice(0, 2);

export default function Circles() {
  const [activeTab, setActiveTab] = useState(0);
  const [acceptedList, setAcceptedList] = useState(accepted);
  const [requestList, setRequestList] = useState(requests);
  const [sentList, setSentList] = useState(sent);
  const [query, setQuery] = useState("");

  function acceptRequest(id: string) {
    const user = requestList.find(u => u.id === id);
    if (user) {
      setAcceptedList(prev => [...prev, { ...user, circleStatus: "accepted" as const }]);
      setRequestList(prev => prev.filter(u => u.id !== id));
    }
  }

  function declineRequest(id: string) {
    setRequestList(prev => prev.filter(u => u.id !== id));
  }

  function cancelSent(id: string) {
    setSentList(prev => prev.filter(u => u.id !== id));
  }

  function removeFriend(id: string) {
    setAcceptedList(prev => prev.filter(u => u.id !== id));
  }

  const filteredAccepted = acceptedList.filter(u =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Page header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3 px-4 h-14">
        <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <div>
          <h1 className="font-bold text-base leading-tight">Amigos</h1>
          <p className="text-xs text-muted-foreground">{acceptedList.length} amigos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border sticky top-14 bg-background z-20">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            data-testid={`tab-circles-${tab}`}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {i === 1 && requestList.length > 0 && (
              <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">
                {requestList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 0: Amigos */}
      {activeTab === 0 && (
        <>
          {/* Search */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar amigos"
                className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {filteredAccepted.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium">
                {query ? "Nenhum amigo encontrado" : "Nenhum amigo ainda"}
              </p>
              <p className="text-sm mt-1 opacity-70">
                {query ? `Sem resultado para "${query}"` : "Encontre pessoas e envie solicitações de amizade."}
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
                    onClick={() => removeFriend(user.id)}
                    data-testid={`button-remove-circle-${user.id}`}
                    className="shrink-0 px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                  >
                    Remover
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 1: Solicitações recebidas */}
      {activeTab === 1 && (
        <div>
          {requestList.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Check className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium">Nenhuma solicitação</p>
              <p className="text-sm mt-1 opacity-70">Solicitações de amizade aparecerão aqui.</p>
            </div>
          ) : (
            requestList.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                data-testid={`request-${user.id}`}
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
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => acceptRequest(user.id)}
                    data-testid={`button-accept-${user.id}`}
                    className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => declineRequest(user.id)}
                    data-testid={`button-decline-${user.id}`}
                    className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                  >
                    Recusar
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Enviadas */}
      {activeTab === 2 && (
        <div>
          {sentList.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Clock className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium">Nenhuma solicitação enviada</p>
              <p className="text-sm mt-1 opacity-70">Solicitações enviadas aparecerão aqui.</p>
            </div>
          ) : (
            sentList.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                data-testid={`sent-${user.id}`}
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
                  onClick={() => cancelSent(user.id)}
                  data-testid={`button-cancel-${user.id}`}
                  className="shrink-0 px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                >
                  Cancelar
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
