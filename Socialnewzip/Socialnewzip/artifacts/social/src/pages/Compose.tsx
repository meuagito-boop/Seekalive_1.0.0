import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Video, Globe, Users, Lock, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import type { PostMediaType } from "@/lib/postMedia";

const MAX_CHARS = 280;
const MAX_MEDIA_ITEMS = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
type SelectedMedia = { url: string; type: PostMediaType; name: string };

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
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [mediaError, setMediaError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;
  const canPost = (content.trim().length > 0 || selectedMedia.length > 0) && !isOverLimit;

  const selectedAudience = audiences.find(a => a.value === audience)!;
  const AudienceIcon = selectedAudience.icon;

  const progressPct = Math.min(content.length / MAX_CHARS, 1);
  const circumference = 2 * Math.PI * 12; // r=12

  function addMediaFiles(fileList: FileList | null, type: PostMediaType) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    const maxBytes = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    const supportedFiles = files.filter((file) => file.type.startsWith(`${type}/`));
    const oversizedCount = supportedFiles.filter((file) => file.size > maxBytes).length;
    const validFiles = supportedFiles.filter((file) => file.size <= maxBytes);
    const remainingSlots = Math.max(0, MAX_MEDIA_ITEMS - selectedMedia.length);
    const filesToAdd = validFiles.slice(0, remainingSlots);
    const errors = [];

    if (supportedFiles.length < files.length) errors.push("Alguns arquivos não são desse tipo.");
    if (oversizedCount) errors.push(type === "image" ? "Cada foto pode ter até 10 MB." : "Cada vídeo pode ter até 100 MB.");
    if (validFiles.length > remainingSlots) errors.push(`Você pode adicionar até ${MAX_MEDIA_ITEMS} mídias por publicação.`);

    setSelectedMedia((current) => [
      ...current,
      ...filesToAdd.map((file) => ({
        url: URL.createObjectURL(file),
        type,
        name: file.name,
      })),
    ]);
    setMediaError(errors.join(" "));
  }

  function removeMedia(url: string) {
    URL.revokeObjectURL(url);
    setSelectedMedia((current) => current.filter((media) => media.url !== url));
  }

  function handlePost() {
    if (!canPost) return;
    addPost(
      content.trim(),
      audience,
      currentUser?.id ?? "me",
      selectedMedia.map((media) => media.url),
      selectedMedia.map((media) => media.type),
    );
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
            {selectedMedia.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedMedia.map((media) => (
                  <div key={media.url} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                    {media.type === "image" ? (
                      <img src={media.url} alt={media.name} className="h-full w-full object-cover" />
                    ) : (
                      <video src={media.url} controls playsInline className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(media.url)}
                      aria-label={`Remover ${media.name}`}
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {mediaError && <p role="alert" className="mt-2 text-sm text-destructive">{mediaError}</p>}
          </div>
        </div>
      </div>

      {/* Footer toolbar */}
      <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                addMediaFiles(event.currentTarget.files, "image");
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                addMediaFiles(event.currentTarget.files, "video");
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={selectedMedia.length >= MAX_MEDIA_ITEMS}
              className="text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
              data-testid="button-add-image"
              aria-label="Adicionar fotos"
              title="Adicionar fotos"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={selectedMedia.length >= MAX_MEDIA_ITEMS}
              className="text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
              data-testid="button-add-video"
              aria-label="Adicionar vídeos"
              title="Adicionar vídeos"
            >
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
        <p className="mt-2 text-[11px] text-muted-foreground">
          Até {MAX_MEDIA_ITEMS} mídias por publicação · fotos até 10 MB · vídeos até 100 MB
        </p>
      </div>
    </div>
  );
}
