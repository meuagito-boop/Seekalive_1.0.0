import { BrandMark } from "@/components/brand/BrandMark";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Splash() {
  return (
    <main className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 py-12 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-44 -top-52 h-[34rem] w-[34rem] rounded-full border border-primary/10 sm:right-[-7rem] sm:top-[-13rem]" />
        <div className="absolute -right-28 -top-36 h-[27rem] w-[27rem] rounded-full border border-primary/10 sm:right-[-1rem] sm:top-[-7rem]" />
        <div className="absolute -right-12 -top-20 h-[20rem] w-[20rem] rounded-full bg-primary/[0.055] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative grid w-full max-w-5xl items-center gap-12 md:grid-cols-[1fr_0.78fr] md:gap-20"
      >
        <section className="mx-auto w-full max-w-xl text-center md:mx-0 md:text-left">
          <div className="mb-10 flex items-center justify-center gap-3 md:justify-start">
            <BrandMark className="h-12 w-12" />
            <span className="text-xl font-bold tracking-tight text-foreground">Seekalive</span>
          </div>

          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">O mundo acontece por perto</p>
          <h1 className="text-5xl font-bold leading-[1.02] tracking-[-0.055em] text-foreground sm:text-6xl">
            Encontre o que <span className="text-primary">te move.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg md:mx-0">
            Pessoas, ideias e lugares para descobrir — tudo no mesmo espaço. Compartilhe seu mundo e encontre o seu próximo.
          </p>

          <div className="mx-auto mt-10 w-full max-w-sm md:mx-0">
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-border bg-card/70 px-6 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              data-testid="button-login"
            >
              Continuar para entrar
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Uma conta para sua vida pessoal e para o seu negócio.</p>
        </section>

        <aside aria-label="Descubra o que acontece ao seu redor" className="relative mx-auto hidden w-full max-w-sm md:block">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-2xl shadow-black/20">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <div className="mb-12 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">No Seek, por perto</span>
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background/80 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">M</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Mercado da Vila</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Perfil comercial no Seek</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">Novidades e encontros acontecendo no seu bairro.</p>
                </div>
                <div className="ml-8 rounded-2xl border border-primary/20 bg-primary/[0.07] p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Descobertas locais</p>
                  <p className="text-lg font-semibold leading-snug text-foreground">Descobertas que começam perto de você.</p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                Pessoas e negócios, juntos
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          </div>
        </aside>
      </motion.div>
    </main>
  );
}
