import { useState } from "react";
import { Shuffle, MapPin, Star, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const mockSuggestions = [
  { id: "r1", name: "Cantina do Nonno",   category: "Restaurante", distance: "0,7 km", rating: 4.7, img: "https://picsum.photos/seed/rlt1/600/400", description: "Culinária italiana autêntica num ambiente aconchegante." },
  { id: "r2", name: "Club Neon",           category: "Bar / Balada", distance: "1,1 km", rating: 4.3, img: "https://picsum.photos/seed/rlt2/600/400", description: "Shows de música eletrônica toda sexta e sábado." },
  { id: "r3", name: "Espaço Zen Spa",      category: "Bem-estar",   distance: "0,4 km", rating: 4.9, img: "https://picsum.photos/seed/rlt3/600/400", description: "Massagens relaxantes, sauna e banho turco." },
  { id: "r4", name: "Pizzaria Napolitana", category: "Restaurante", distance: "0,9 km", rating: 4.6, img: "https://picsum.photos/seed/rlt4/600/400", description: "Pizzas assadas em forno a lenha com ingredientes importados." },
  { id: "r5", name: "Cineminha Cult",      category: "Lazer",       distance: "1,3 km", rating: 4.8, img: "https://picsum.photos/seed/rlt5/600/400", description: "Cinema alternativo com sessões de filmes cult e debates." },
];

export default function Roleta() {
  const [current, setCurrent] = useState<(typeof mockSuggestions)[0] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [key, setKey] = useState(0);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setCurrent(null);
    setTimeout(() => {
      const random = mockSuggestions[Math.floor(Math.random() * mockSuggestions.length)];
      setCurrent(random);
      setSpinning(false);
      setKey((k) => k + 1);
    }, 1400);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
          <Shuffle className="w-9 h-9 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Roleta SeekAlive</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Descubra lugares e experiências perto de você de forma aleatória. Deixe a sorte decidir!
        </p>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-8"
      >
        <RefreshCw className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} />
        {spinning ? "Girando..." : current ? "Girar novamente" : "Girar a Roleta"}
      </button>

      <AnimatePresence mode="wait">
        {spinning && (
          <motion.div
            key="spinner"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="w-full max-w-sm"
          >
            <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="h-52 bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-muted rounded-full w-3/4 mx-auto" />
                <div className="h-4 bg-muted rounded-full w-1/2 mx-auto" />
                <div className="h-4 bg-muted rounded-full w-5/6 mx-auto" />
              </div>
            </div>
          </motion.div>
        )}

        {!spinning && current && (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-full max-w-sm"
          >
            <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-xl">
              <div className="relative h-52 overflow-hidden">
                <img src={current.img} alt={current.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                  {current.category}
                </span>
              </div>
              <div className="p-5 text-left">
                <h2 className="text-xl font-bold text-foreground mb-1">{current.name}</h2>
                <p className="text-sm text-muted-foreground mb-3">{current.description}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {current.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {current.rating}
                  </span>
                </div>
                <button className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                  Ver detalhes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!spinning && !current && (
        <p className="text-muted-foreground text-sm mt-2">
          Aperte o botão e descubra seu próximo destino.
        </p>
      )}
    </div>
  );
}
