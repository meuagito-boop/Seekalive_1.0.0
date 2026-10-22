import { BrandMark } from "@/components/brand/BrandMark";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interests } from "@/data/mockData";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";
import { saveAccountInterests } from "@/data/appPreferences";

export default function OnboardingInterests() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { currentUser, updateAccount } = useAppContext();
  const { updateUser } = useSocial();

  useEffect(() => {
    if (!currentUser) setLocation("/login");
    else if (currentUser.onboardingCompleted !== false) setLocation("/feed");
  }, [currentUser, setLocation]);

  function toggle(interest: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(interest)) next.delete(interest);
      else next.add(interest);
      return next;
    });
  }

  const canContinue = selected.size >= 3;

  function saveAndContinue(skipped: boolean) {
    if (!currentUser) {
      setLocation("/login");
      return;
    }
    const selectedInterests = skipped ? [] : Array.from(selected);
    const updatedUser = { ...currentUser, interests: selectedInterests, onboardingCompleted: true };
    saveAccountInterests(currentUser.id, selectedInterests, skipped);
    updateAccount(updatedUser);
    updateUser(updatedUser);
    setLocation(skipped ? "/feed" : "/onboarding/suggestions");
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-5 py-10 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-10rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-primary/[0.06] blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-xl rounded-[1.75rem] border border-border bg-card/75 p-6 shadow-2xl shadow-black/15 backdrop-blur-sm sm:p-9"
      >
        <div className="flex items-center gap-2 mb-10">
          <BrandMark />
          <span className="text-xl font-bold tracking-tight">Seekalive</span>
        </div>

        <div className="mb-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Passo 1 de 2 · Seus interesses</p>
          <div className="flex gap-2 mb-6">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className="h-1 flex-1 rounded-full bg-border" />
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">O que desperta sua curiosidade?</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">
          Escolha pelo menos 3 temas. Vamos usá-los para aproximar você de pessoas, conteúdos e lugares relevantes.
          {selected.size > 0 && (
            <span aria-live="polite" className="font-medium text-primary"> {selected.size} selecionados</span>
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
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggle(interest)}
                data-testid={`interest-${interest}`}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-[0_8px_24px_hsl(27_96%_53%_/_0.2)]"
                    : "bg-background/70 border-border text-foreground hover:border-primary/50"
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
          onClick={() => saveAndContinue(false)}
          data-testid="button-next-onboarding"
        >
          {canContinue ? "Continuar" : `Escolha mais ${3 - selected.size}`}
        </Button>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => saveAndContinue(true)}
          data-testid="button-skip-interests"
        >
          Pular por agora
        </button>
      </motion.div>
    </div>
  );
}
