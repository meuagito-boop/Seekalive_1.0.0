import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SocialSidebar } from "./SocialSidebar";

interface SocialDrawerProps {
  open: boolean;
  onClose: () => void;
  returnFocus: () => void;
}

// Radix Dialog cuida de focus trap (Tab circula), trava de rolagem,
// Escape e devolução do foco ao gatilho.
export function SocialDrawer({ open, onClose, returnFocus }: SocialDrawerProps) {
  const [location] = useLocation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lastLocation = useRef(location);

  useEffect(() => {
    if (lastLocation.current !== location) {
      lastLocation.current = location;
      onCloseRef.current();
    }
  }, [location]);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="left"
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus(); }}
        className="w-72 max-w-[85vw] p-0 gap-0 flex flex-col bg-background border-r border-border [&>button:last-child]:hidden"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center" aria-hidden="true">
              <span className="text-primary-foreground font-black text-[10px] leading-none">S</span>
            </div>
            <SheetTitle className="font-bold text-sm text-foreground">SeekAlive</SheetTitle>
          </div>
          <SheetDescription className="sr-only">Menu de navegação do Social</SheetDescription>
          <SheetClose
            aria-label="Fechar menu"
            className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SocialSidebar onNavigate={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
