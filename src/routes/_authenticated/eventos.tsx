import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Gift, MapPin, Music2, Sparkles } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { supabase } from "@/integrations/supabase/client";
import { campaignBenefitLabel, formatEventDate, formatEventTime } from "@/lib/bafafa";

type CampaignPreview = {
  id: string;
  name: string;
  benefit_type: string;
  discount_percent: number | null;
  fixed_off_cents: number | null;
  product_name: string | null;
};

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  attraction: string | null;
  image_url: string | null;
  starts_at: string;
  checkin_enabled: boolean;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  status: string;
  campaigns?: CampaignPreview[] | null;
};

export const Route = createFileRoute("/_authenticated/eventos")({
  component: Eventos,
});

function Eventos() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("events")
      .select(
        "id,name,description,category,attraction,image_url,starts_at,checkin_enabled,checkin_opens_at,checkin_closes_at,status,campaigns(id,name,benefit_type,discount_percent,fixed_off_cents,product_name)",
      )
      .in("status", ["scheduled", "ongoing", "ended"])
      .order("starts_at", { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!mounted) return;
        if (queryError) setError(queryError.message);
        else setEvents((data ?? []) as unknown as EventRow[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const upcoming = events.filter(
    (event) => new Date(event.starts_at).getTime() >= Date.now() - 6 * 60 * 60 * 1000,
  );
  const past = events
    .filter((event) => !upcoming.includes(event))
    .reverse()
    .slice(0, 4);

  return (
    <AppShell>
      <ScreenHeader eyebrow="Agenda semanal" title="Eventos" tone="brick" />
      {loading && <LoadingCard label="Organizando a agenda…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-7 px-5 pt-2">
          {upcoming.length === 0 ? (
            <div className="poster-card checker-texture p-6 text-foreground">
              <span className="cut-label bg-white">agenda do bafafá</span>
              <CalendarDays className="mt-5 h-8 w-8" />
              <h2 className="mt-3 font-display text-4xl leading-none">A próxima fofoca ainda não saiu.</h2>
              <p className="mt-3 text-sm font-semibold opacity-75">
                Assim que o próximo rolê for publicado, ele aparece com horário, atração e mimo.
              </p>
            </div>
          ) : (
            <section className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <p className="section-kicker text-muted-foreground">Próximos rolês</p>
                <span className="cut-label bg-lagoa">{upcoming.length} na agenda</span>
              </div>
              {upcoming.map((event, index) => (
                <EventCard key={event.id} event={event} featured={index === 0} />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-4 pb-4">
              <p className="section-kicker text-muted-foreground">Já rolou e deixou história</p>
              {past.map((event) => (
                <EventCard key={event.id} event={event} past />
              ))}
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function EventCard({
  event,
  featured = false,
  past = false,
}: {
  event: EventRow;
  featured?: boolean;
  past?: boolean;
}) {
  const campaign = event.campaigns?.[0];
  const date = new Date(event.starts_at);
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "");

  return (
    <article
      className={`${featured ? "poster-card" : "sticker-card"} overflow-hidden ${past ? "opacity-75 grayscale-[.2]" : ""} bg-card`}
    >
      <div className={`relative ${featured ? "aspect-[4/3]" : "aspect-[16/8]"} overflow-hidden`}>
        {event.image_url ? (
          <img src={event.image_url} alt={`Imagem de ${event.name}`} className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full ${featured ? "brick-texture" : "grid-texture bg-electric"}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/15 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="cut-label bg-mango text-foreground">{event.category}</span>
          {event.status === "ongoing" && (
            <span className="cut-label rotate-[2deg] bg-samba text-white">
              <Sparkles className="h-3.5 w-3.5" /> rolando agora
            </span>
          )}
        </div>
        <div className="absolute right-4 top-4 grid h-18 w-18 rotate-3 place-items-center rounded-full border-[3px] border-foreground bg-background text-center text-foreground shadow-[3px_4px_0_var(--foreground)]">
          <div>
            <p className="font-display text-3xl leading-none">{day}</p>
            <p className="text-[10px] font-black uppercase">{month}</p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h2 className={`${featured ? "text-5xl" : "text-4xl"} font-display leading-[0.88]`}>
            {event.name}
          </h2>
          {event.attraction && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-white/90">
              <Music2 className="h-4 w-4 text-mango" /> {event.attraction}
            </p>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-2 text-sm font-semibold text-muted-foreground">
          <p className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-secondary" /> {formatEventDate(event.starts_at)} · a partir das {formatEventTime(event.starts_at)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brick" /> Praça Dr. Amaro de Souza · Lagoa Nova
          </p>
        </div>

        {event.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{event.description}</p>}

        {campaign && (
          <div className="ticket-card checker-texture mt-5 p-4 text-foreground">
            <div className="flex items-start gap-3">
              <Gift className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="section-kicker">Mimo do evento</p>
                <p className="mt-1 font-poster text-base leading-tight">{campaignBenefitLabel(campaign)}</p>
              </div>
            </div>
          </div>
        )}

        {event.checkin_enabled && !past && (
          <Link
            to="/checkin"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Abrir meu check-in <Sparkles className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
