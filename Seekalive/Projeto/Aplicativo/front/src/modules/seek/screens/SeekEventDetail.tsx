import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, CalendarDays, MapPin, Share2, Users, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocial } from "@/modules/app/state/SocialContext";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";
import { UnavailableState } from "@/components/content/StateBlocks";
import type { SeekEvent } from "@/modules/seek/types/event";

export default function SeekEventDetail() {
  const params = useParams<{ id: string }>();
  const { getUserById } = useSocial();
  const [shareOpen, setShareOpen] = useState(false);
  const [event, setEvent] = useState<SeekEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(import.meta.env.DEV);
  const [fixtureError, setFixtureError] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    setEvent(null);
    setEventLoading(true);
    setFixtureError(false);
    void import("@/modules/app/data/demo/previewFixtures")
      .then(({ developmentSeekEvents }) => {
        if (active) setEvent(developmentSeekEvents.find((item) => item.id === params.id) ?? null);
      })
      .catch(() => {
        if (active) setFixtureError(true);
      })
      .finally(() => {
        if (active) setEventLoading(false);
      });
    return () => { active = false; };
  }, [params.id]);

  if (eventLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">Carregando evento...</div>;
  }

  if (!event) {
    return (
      <UnavailableState
        title="Evento indisponível"
        description={fixtureError
          ? "Não foi possível carregar os dados de demonstração."
          : "Este evento não existe mais ou o link está incorreto."}
        action={<Button asChild className="rounded-full"><Link href="/seek">Voltar ao Seek</Link></Button>}
      />
    );
  }
  const organizer = event.organizerId ? getUserById(event.organizerId) : undefined;
  if (organizer?.isBlocked) {
    return <UnavailableState title="Evento indisponível" description="O perfil organizador está bloqueado para esta conta." />;
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl pb-24">
      <div className="relative h-56 overflow-hidden md:mt-4 md:h-72 md:rounded-2xl">
        <img src={event.img} alt={`Foto ilustrativa de ${event.name}`} className="absolute inset-0 h-full w-full object-cover"
          onError={event => { event.currentTarget.style.display = "none"; }} />
        <div className="flex h-full items-center justify-center bg-primary/10">
          <CalendarDays className="h-16 w-16 text-primary/60" aria-hidden="true" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <Link href="/seek" aria-label="Voltar ao Seek" className="absolute left-3 top-3 rounded-full bg-background/70 p-2 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>
      <div className="relative z-10 -mt-10 px-4 md:px-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">Seek · Evento de demonstração</span>
        <p className="mt-2 text-sm text-muted-foreground">Exemplo para testar a interface. Data, preço e interessados não representam um evento real.</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{event.name}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><CalendarDays className="h-4 w-4 text-primary" /><dt className="sr-only">Data</dt><dd>{event.date}</dd></div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><MapPin className="h-4 w-4 text-primary" /><dt className="sr-only">Local</dt><dd>{event.venue}</dd></div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><Ticket className="h-4 w-4 text-primary" /><dt className="sr-only">Entrada</dt><dd>{event.price}</dd></div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><Users className="h-4 w-4 text-primary" /><dt className="sr-only">Interessados</dt><dd>{event.interested} interessados</dd></div>
        </dl>
        {organizer && (
          <p className="mt-4 text-sm text-muted-foreground">
            Organizado por <Link href={`/profile/${organizer.username}`} className="font-semibold text-primary hover:underline">{organizer.displayName}</Link>
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setShareOpen(true)} className="rounded-full" data-testid="button-share-event">
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar
          </Button>
          <Button variant="outline" disabled className="rounded-full" title="Ingressos ainda não estão disponíveis no Seekalive">
            <Ticket className="mr-2 h-4 w-4" /> Ingressos indisponíveis
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Inscrição e venda de ingressos não estão disponíveis nesta versão.</p>
      </div>
      <ShareContentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        reference={{ type: "seek_entity", id: `event:${event.id}` }}
        title={event.name}
        linkPath={`/seek/event/${event.id}`}
      />
    </div>
  );
}
