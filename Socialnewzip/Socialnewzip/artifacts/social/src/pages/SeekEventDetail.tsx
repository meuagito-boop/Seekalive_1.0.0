import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, CalendarDays, MapPin, Share2, Users, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoSeekEvents } from "@/data/demoSeekEvents";
import { useSocial } from "@/context/SocialContext";
import { ShareContentDialog } from "@/components/content/ShareContentDialog";
import { DemoBadge, UnavailableState } from "@/components/content/StateBlocks";

export default function SeekEventDetail() {
  const params = useParams<{ id: string }>();
  const { getUserById } = useSocial();
  const [shareOpen, setShareOpen] = useState(false);
  const event = demoSeekEvents.find((e) => e.id === params.id);

  if (!event) {
    return (
      <UnavailableState
        title="Evento indisponível"
        description="Este evento não existe mais ou o link está incorreto."
        action={<Button asChild className="rounded-full"><Link href="/seek">Voltar ao Seek</Link></Button>}
      />
    );
  }
  const organizer = event.organizerId ? getUserById(event.organizerId) : undefined;

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl pb-24">
      <div className="relative h-56 overflow-hidden md:mt-4 md:h-72 md:rounded-2xl">
        <img src={event.img} alt={event.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <Link href="/seek" aria-label="Voltar ao Seek" className="absolute left-3 top-3 rounded-full bg-background/70 p-2 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <DemoBadge className="absolute right-3 top-3 bg-background/70 backdrop-blur" label="Evento de exemplo" />
      </div>
      <div className="-mt-10 px-4 md:px-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-info">Seek · Evento</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{event.name}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><CalendarDays className="h-4 w-4 text-info" /><dt className="sr-only">Data</dt><dd>{event.date}</dd></div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><MapPin className="h-4 w-4 text-info" /><dt className="sr-only">Local</dt><dd>{event.venue}</dd></div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><Ticket className="h-4 w-4 text-primary" /><dt className="sr-only">Entrada</dt><dd>{event.price} <span className="text-xs text-muted-foreground">(valor informado no exemplo)</span></dd></div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"><Users className="h-4 w-4 text-primary" /><dt className="sr-only">Interessados</dt><dd>{event.interested} interessados</dd></div>
        </dl>
        {organizer && (
          <p className="mt-4 text-sm text-muted-foreground">
            Organizado por <Link href={`/profile/${organizer.username}`} className="font-semibold text-info hover:underline">{organizer.displayName}</Link>
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setShareOpen(true)} className="rounded-full" data-testid="button-share-event">
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar
          </Button>
          <Button variant="outline" disabled className="rounded-full" title="Ingressos ainda não estão disponíveis no SeekAlive">
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
