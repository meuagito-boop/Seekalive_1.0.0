import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Circle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interests } from "@/data/mockData";

export default function OnboardingInterests() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  function toggle(interest: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(interest)) next.delete(interest);
      else next.add(interest);
      return next;
    });
  }

  const canContinue = selected.size >= 3;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-10">
          <Circle className="w-7 h-7 fill-primary text-primary" />
          <span className="text-xl font-bold tracking-tight">SeekAlive</span>
        </div>

        <div className="mb-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Passo 1 de 2</p>
          <div className="flex gap-2 mb-6">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className="h-1 flex-1 rounded-full bg-border" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">O que te interessa?</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Selecione pelo menos 3 tópicos para personalizar seu feed.
          {selected.size > 0 && (
            <span className="text-primary font-medium"> ({selected.size} selecionados)</span>
          )}
        </p>

        <div className="flex flex-wrap gap-2 mb-10">
          {interests.map((interest, i) => {
            const isSelected = selected.has(interest);
            return (
              <motion.button
                key={interest}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => toggle(interest)}
                data-testid={`interest-${interest}`}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                    : "bg-card border-border text-foreground hover:border-primary/50"
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                {interest}
              </motion.button>
            );
          })}
        </div>

        <Button
          className="w-full h-12 rounded-xl font-semibold"
          disabled={!canContinue}
          onClick={() => setLocation("/onboarding/suggestions")}
          data-testid="button-next-onboarding"
        >
          {canContinue ? "Próximo" : `Selecione mais ${3 - selected.size}`}
        </Button>
      </motion.div>
    </div>
  );
}
