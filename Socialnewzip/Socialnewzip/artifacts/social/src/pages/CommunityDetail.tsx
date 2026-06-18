import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Settings, Users, FileText, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post/PostCard";
import { mockCommunities, mockPosts, mockUsers, getUserById, formatCount } from "@/data/mockData";

const tabs = ["Feed", "Membros", "Sobre"];

export default function CommunityDetail() {
  const params = useParams<{ communityId: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(0);

  const community = mockCommunities.find(c => c.id === params.communityId) ?? mockCommunities[0];
  const [isJoined, setIsJoined] = useState(community.isJoined ?? false);
  const communityPosts = mockPosts.slice(0, 5);
  const isOwner = community.ownerId === "me";

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center gap-3 px-4 h-14 border-b border-border">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base flex-1 truncate">{community.name}</h1>
        {isOwner && (
          <Link href={`/communities/${community.id}/settings`}>
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground" data-testid="button-settings">
              <Settings className="w-5 h-5" />
            </button>
          </Link>
        )}
      </div>

      <div className="relative">
        <div className="h-36 bg-gradient-to-br from-primary/30 via-accent/20 to-background overflow-hidden">
          {community.bannerUrl && (
            <img src={community.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-4">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <Avatar className="w-16 h-16 border-4 border-background">
              <AvatarImage src={community.iconUrl} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{community.name[0]}</AvatarFallback>
            </Avatar>
            <Button
              onClick={() => setIsJoined(v => !v)}
              variant={isJoined ? "outline" : "default"}
              className="rounded-full h-9 px-5 text-sm font-semibold"
              data-testid="button-join"
            >
              {isJoined ? "Participando" : "Entrar"}
            </Button>
          </div>
          <h2 className="text-xl font-bold">{community.name}</h2>
          <p className="text-sm text-muted-foreground mb-1">{community.category}</p>
          <p className="text-sm mb-3">{community.description}</p>
          <div className="flex gap-5 text-sm mb-1">
            <span><strong className="text-foreground">{formatCount(community.memberCount)}</strong><span className="text-muted-foreground ml-1">membros</span></span>
            <span><strong className="text-foreground">{formatCount(community.postsCount)}</strong><span className="text-muted-foreground ml-1">posts</span></span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border sticky top-14 bg-background z-20">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            data-testid={`tab-${tab}`}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {i === 0 ? <FileText className="w-4 h-4 inline mr-1" /> : i === 1 ? <Users className="w-4 h-4 inline mr-1" /> : <Info className="w-4 h-4 inline mr-1" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div>
          {communityPosts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {activeTab === 1 && (
        <div>
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Dono</div>
          {(() => {
            const owner = getUserById(community.ownerId) ?? mockUsers[0];
            return (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Avatar className="w-10 h-10"><AvatarImage src={owner.avatarUrl} /><AvatarFallback>{owner.displayName[0]}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="font-semibold text-sm">{owner.displayName}</p><p className="text-xs text-muted-foreground">@{owner.username}</p></div>
                <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">Dono</span>
              </div>
            );
          })()}
          {community.moderatorIds.length > 0 && (
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Moderadores</div>
          )}
          {community.moderatorIds.map(modId => {
            const mod = getUserById(modId) ?? mockUsers[1];
            return (
              <div key={modId} className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Avatar className="w-10 h-10"><AvatarImage src={mod.avatarUrl} /><AvatarFallback>{mod.displayName[0]}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="font-semibold text-sm">{mod.displayName}</p><p className="text-xs text-muted-foreground">@{mod.username}</p></div>
                <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full font-semibold">Moderador</span>
              </div>
            );
          })}
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Membros</div>
          {mockUsers.slice(0, 5).map(user => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20">
              <Avatar className="w-10 h-10"><AvatarImage src={user.avatarUrl} /><AvatarFallback>{user.displayName[0]}</AvatarFallback></Avatar>
              <div className="flex-1"><p className="font-semibold text-sm">{user.displayName}</p><p className="text-xs text-muted-foreground">@{user.username}</p></div>
              <span className="text-xs text-muted-foreground">Membro</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 2 && (
        <div className="px-4 py-4 space-y-6">
          <div>
            <h3 className="font-bold mb-2">Sobre</h3>
            <p className="text-sm text-muted-foreground">{community.description}</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Detalhes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Categoria</span><span>{community.category}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Privacidade</span><span>{community.isPrivate ? "Privada" : "Pública"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Criada em</span><span>{new Date(community.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span></div>
            </div>
          </div>
          {community.rules.length > 0 && (
            <div>
              <h3 className="font-bold mb-3">Regras</h3>
              <div className="space-y-2">
                {community.rules.map((rule, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-card rounded-xl border border-border">
                    <span className="text-primary font-bold text-sm shrink-0">{i + 1}.</span>
                    <p className="text-sm">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
