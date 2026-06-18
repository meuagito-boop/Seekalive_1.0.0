import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Video, Globe, Users, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";

const MAX_CHARS = 280;
const audiences = [
  { value: "public" as const, label: "Público", icon: Globe, desc: "Qualquer pessoa pode ver" },
  { value: "circles" as const, label: "Amigos", icon: Users, desc: "Apenas seus amigos" },
  { value: "private" as const, label: "Privado", icon: Lock, desc: "Somente você" },
];

export default function Compose() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAppContext();
  const { addPost } = useSocial();

  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"public" | "circles" | "private">("public");
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const canPost = content.trim().length > 0 && !isOverLimit;

  const selectedAudience = audiences.find(a => a.value === audience)!;
  const AudienceIcon = selectedAudience.icon;

  const progressPct = Math.min(content.length / MAX_CHARS, 1);
  const circumference = 2 * Math.PI * 12; // r=12

  function handlePost() {
    if (!canPost) return;
    addPost(content.trim(), audience);
    setLocation("/feed");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors"
          data-testid="button-cancel"
        >
          <X className="w-5 h-5" />
        </button>
        <Button
          onClick={handlePost}
          disabled={!canPost}
          className="rounded-full px-5 h-8 text-sm font-semibold"
          data-testid="button-post"
        >
          Publicar
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pt-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={currentUser?.avatarUrl ?? "https://i.pravatar.cc/150?img=68"} />
            <AvatarFallback>{currentUser?.displayName?.[0] ?? "O"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 relative">
            {/* Audience picker button */}
            <button
              onClick={() => setShowAudiencePicker(v => !v)}
              data-testid="button-audience"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/60 text-primary text-xs font-semibold mb-3 hover:bg-primary/10 transition-colors"
            >
              <AudienceIcon className="w-3 h-3" />
              {selectedAudience.label}
            </button>

            <AnimatePresence>
              {showAudiencePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  className="absolute top-10 left-0 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-56"
                >
                  {audiences.map(a => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.value}
                        onClick={() => { setAudience(a.value); setShowAudiencePicker(false); }}
                        data-testid={`audience-option-${a.value}`}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${audience === a.value ? "text-primary" : "text-foreground"}`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">{a.label}</p>
                          <p className="text-xs text-muted-foreground">{a.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="O que está acontecendo no universo?"
              data-testid="input-compose"
              rows={6}
              autoFocus
              className="w-full bg-transparent text-foreground text-lg placeholder:text-muted-foreground border-none outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer toolbar */}
      <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button className="text-primary hover:opacity-70 transition-opacity" data-testid="button-add-image">
              <Image className="w-5 h-5" />
            </button>
            <button className="text-primary hover:opacity-70 transition-opacity" data-testid="button-add-video">
              <Video className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Circular progress */}
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-border" />
                <circle
                  cx="16" cy="16" r="12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray={`${progressPct * circumference} ${circumference}`}
                  strokeLinecap="round"
                  className={isOverLimit ? "text-destructive" : remaining < 20 ? "text-yellow-500" : "text-primary"}
                />
              </svg>
              {remaining < 20 && (
                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                  {remaining}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
