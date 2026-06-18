import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";

const accentColors = [
  { label: "Violeta", value: "250 85% 65%", preview: "#7c5af5" },
  { label: "Azul", value: "220 90% 60%", preview: "#3b82f6" },
  { label: "Rosa", value: "330 85% 65%", preview: "#ec4899" },
  { label: "Verde", value: "142 72% 50%", preview: "#22c55e" },
  { label: "Laranja", value: "25 95% 55%", preview: "#f97316" },
  { label: "Ciano", value: "190 90% 50%", preview: "#06b6d4" },
];

const fontSizes = ["Pequeno", "Médio", "Grande"];

export default function SettingsAppearance() {
  const [, setLocation] = useLocation();
  const [fontSize, setFontSize] = useState("Médio");
  const [accentColor, setAccentColor] = useState("250 85% 65%");

  function applyColor(value: string) {
    setAccentColor(value);
    document.documentElement.style.setProperty("--primary", value);
    document.documentElement.style.setProperty("--ring", value);
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center gap-3 px-4 h-14 border-b border-border">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Aparência</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-6 space-y-8">
        <div>
          <h2 className="font-bold text-base mb-1">Modo</h2>
          <p className="text-sm text-muted-foreground mb-4">O Orbit é exclusivamente dark mode.</p>
          <div className="w-full p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-foreground/10 border-2 border-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span className="font-medium text-sm">Dark mode</span>
            <span className="ml-auto text-xs text-muted-foreground">Sempre ativo</span>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-base mb-1">Tamanho da fonte</h2>
          <p className="text-sm text-muted-foreground mb-4">Afeta o texto em todo o aplicativo.</p>
          <div className="flex gap-2">
            {fontSizes.map(size => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                data-testid={`font-size-${size}`}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                  fontSize === size ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <p className={`mt-4 text-muted-foreground ${fontSize === "Pequeno" ? "text-sm" : fontSize === "Grande" ? "text-lg" : "text-base"}`}>
            Pré-visualização do texto com o tamanho selecionado.
          </p>
        </div>

        <div>
          <h2 className="font-bold text-base mb-1">Cor de destaque</h2>
          <p className="text-sm text-muted-foreground mb-4">Personaliza a cor principal do app.</p>
          <div className="grid grid-cols-3 gap-3">
            {accentColors.map(color => {
              const isSelected = accentColor === color.value;
              return (
                <button
                  key={color.value}
                  onClick={() => applyColor(color.value)}
                  data-testid={`accent-${color.label}`}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: color.preview }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {color.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
