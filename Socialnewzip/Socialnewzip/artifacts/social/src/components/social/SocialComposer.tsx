import { useLocation } from "wouter";
import { Image, Video } from "lucide-react";

export function SocialComposer() {
  const [, navigate] = useLocation();

  return (
    <div className="border-b border-border px-4 py-3 bg-background">
      <div className="flex items-center gap-2">
        <button
          className="flex-1 text-left h-10 px-4 rounded-full bg-muted/60 border border-border text-muted-foreground text-sm hover:bg-muted transition-colors truncate"
          onClick={() => navigate("/compose")}
        >
          O que você quer compartilhar?
        </button>
        <button
          onClick={() => navigate("/compose")}
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          aria-label="Enviar foto"
        >
          <Image className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/compose")}
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          aria-label="Enviar vídeo"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
