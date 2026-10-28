import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SettingsSubheader, SectionTitle } from "@/modules/settings/components/SettingsSubheader";
import { getAppearancePreferences, saveAppearancePreferences } from "@/modules/settings/data/appearancePreferences";
import { useAppContext } from "@/modules/app/state/AppContext";
import { localActorId } from "@/modules/app/persistence/browserAccountStorage";

const fontSizes = [
  { label: "Padrão", px: 16 },
  { label: "Grande", px: 18 },
  { label: "Muito grande", px: 20 },
] as const;

function currentRootSize(): number {
  const inline = parseFloat(document.documentElement.style.fontSize);
  return fontSizes.some((f) => f.px === inline) ? inline : 16;
}

export default function SettingsAppearance() {
  const { currentUser } = useAppContext();
  const accountId = localActorId(currentUser?.id);
  const [size, setSize] = useState<number>(() => getAppearancePreferences(accountId).fontSize || currentRootSize());

  useEffect(() => {
    setSize(getAppearancePreferences(accountId).fontSize || currentRootSize());
  }, [accountId]);

  useEffect(() => {
    if (size === 16) document.documentElement.style.removeProperty("font-size");
    else document.documentElement.style.fontSize = `${size}px`;
  }, [size]);

  function applySize(px: number) {
    setSize(px);
    saveAppearancePreferences({ fontSize: px as 16 | 18 | 20 }, accountId);
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Aparência" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
        <SectionTitle>Tema</SectionTitle>
        <div className="mx-4 mt-2 p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center" aria-hidden>
            <Check className="w-3 h-3 text-primary" />
          </div>
          <span className="font-medium text-sm">Modo escuro</span>
          <span className="ml-auto text-xs text-muted-foreground">Sempre ativo</span>
        </div>
        <p className="px-4 mt-2 text-xs text-muted-foreground">
          O Seekalive usa apenas o tema escuro, com o laranja da marca como cor de destaque. Não há outras cores ou temas para escolher.
        </p>

        <SectionTitle>Tamanho do texto</SectionTitle>
        <p className="px-4 text-xs text-muted-foreground mb-3">
          Aumenta textos e controles em todo o aplicativo. A escolha fica salva neste navegador.
        </p>
        <div role="radiogroup" aria-label="Tamanho do texto" className="mx-4 flex gap-2">
          {fontSizes.map((f) => {
            const active = size === f.px;
            return (
              <button
                key={f.px}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => applySize(f.px)}
                data-testid={`font-size-${f.label}`}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="block">{f.label}</span>
                <span className="block text-[11px] opacity-80">{f.px}px</span>
              </button>
            );
          })}
        </div>
        <p className="mx-4 mt-4 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          Exemplo: este parágrafo e o restante do app usam o tamanho selecionado.
        </p>
      </motion.div>
    </div>
  );
}
