import { useState } from "react";
import { motion } from "framer-motion";
import {
  History, Bookmark, Heart, MessageSquare, FileText,
  Clock, Image, ThumbsUp, ArrowLeft,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { mockPosts, mockUsers, getUserById } from "@/data/mockData";
import { useLocation } from "wouter";

const historyItems = mockPosts.slice(0, 4).map((p, i) => ({
  ...p,
  viewedAt: new Date(Date.now() - i * 3600000 * 2).toISOString(),
}));

const savedItems = mockPosts.slice(2, 5).map(p => ({
  ...p,
  savedAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
}));

const likedItems = mockPosts.filter(p => p.isLiked);

const commentItems = mockPosts.slice(1, 4).map((p, i) => ({
  ...p,
  myComment: ["Muito bom!", "Concordo totalmente.", "Incrível demais!"][i],
  commentedAt: new Date(Date.now() - i * 7200000).toISOString(),
}));

const myPosts = mockPosts.slice(0, 3);

function PostRow({ post, meta }: { post: typeof mockPosts[0]; meta?: React.ReactNode }) {
  const author = getUserById(post.authorId) ?? mockUsers[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
    >
      <Avatar className="w-10 h-10 flex-shrink-0 mt-0.5">
        <AvatarImage src={author.avatarUrl} />
        <AvatarFallback className="text-xs font-bold">{author.displayName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-sm font-semibold text-foreground">{author.displayName}</span>
          <span className="text-xs text-muted-foreground">@{author.username}</span>
        </div>
        <p className="text-sm text-foreground/80 line-clamp-2">{post.content}</p>
        {meta && <div className="mt-1.5">{meta}</div>}
      </div>
    </motion.div>
  );
}

export default function ActivityPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header title="Atividades" />

      <div className="sticky top-14 md:top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-4 h-12">
          <button
            onClick={() => navigate(-1 as never)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-base text-foreground">Atividades</h1>
        </div>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap scrollbar-none px-2 gap-0">
          <TabsTrigger value="history" className="flex items-center gap-1.5 flex-shrink-0">
            <History className="w-3.5 h-3.5" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-1.5 flex-shrink-0">
            <Bookmark className="w-3.5 h-3.5" />
            Salvos
          </TabsTrigger>
          <TabsTrigger value="likes" className="flex items-center gap-1.5 flex-shrink-0">
            <Heart className="w-3.5 h-3.5" />
            Curtidas
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-1.5 flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5" />
            Comentários
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex items-center gap-1.5 flex-shrink-0">
            <FileText className="w-3.5 h-3.5" />
            Publicações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          {historyItems.length === 0 ? (
            <EmptyState icon={<History />} label="Nenhum histórico ainda" />
          ) : (
            historyItems.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                meta={
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Visto {new Date(p.viewedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="saved">
          {savedItems.length === 0 ? (
            <EmptyState icon={<Bookmark />} label="Nenhum item salvo" />
          ) : (
            savedItems.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                meta={
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Bookmark className="w-3 h-3" />
                    Salvo
                  </span>
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="likes">
          {likedItems.length === 0 ? (
            <EmptyState icon={<Heart />} label="Nenhuma curtida ainda" />
          ) : (
            likedItems.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                meta={
                  <span className="text-[11px] text-primary flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    Você curtiu
                  </span>
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="comments">
          {commentItems.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              meta={
                <div className="mt-1 bg-muted/40 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Seu comentário</p>
                  <p className="text-xs text-foreground">{p.myComment}</p>
                </div>
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="posts">
          {myPosts.length === 0 ? (
            <EmptyState icon={<FileText />} label="Nenhuma publicação ainda" />
          ) : (
            myPosts.map((p) => <PostRow key={p.id} post={p} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center opacity-40">
        {icon}
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
