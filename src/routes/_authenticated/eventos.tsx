import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Gift, Music2 } from "lucide-react";
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
        "id,name,description,category,attraction,starts_at,checkin_enabled,checkin_opens_at,checkin_closes_at,status,campaigns(id,name,benefit_type,discount_percent,fixed_off_cents,product_name)",
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
      <ScreenHeader eyebrow="Agenda do Bafafá" title="Eventos" />
      {loading && <LoadingCard label="Organizando a agenda…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-6 px-5">
          {upcoming.length === 0 ? (
            <div className="card-festa bg-primary p-6 text-primary-foreground">
              <CalendarDays className="h-7 w-7" />
              <h2 className="mt-3 font-display text-2xl">A agenda está quase saindo.</h2>
              <p className="mt-2 text-sm opacity-90">
                Quando o próximo evento for publicado, ele aparece aqui com horário, atração e mimo
                disponível.
              </p>
            </div>
          ) : (
            <section className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Próximos
              </p>
              {upcoming.map((event, index) => (
                <EventCard key={event.id} event={event} featured={index === 0} />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3 pb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Já rolou
              </p>
              {past.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function EventCard({ event, featured = false }: { event: EventRow; featured?: boolean }) {
  const campaign = event.campaigns?.[0];
  return (
    <article
      className={`card-festa overflow-hidden ${featured ? "bg-foreground text-background" : "bg-card"}`}
    >
      <div className={`h-2 ${featured ? "bg-samba" : "bg-primary"}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-[0.18em] ${featured ? "text-background/65" : "text-muted-foreground"}`}
            >
              {event.category}
            </p>
            <h2 className="mt-1 font-display text-2xl leading-tight">{event.name}</h2>
          </div>
          {event.status === "ongoing" && (
            <span className="shrink-0 rounded-full bg-samba px-3 py-1 text-[10px] font-bold uppercase text-samba-foreground">
              Rolando agora
            </span>
          )}
        </div>

        <div
          className={`mt-4 grid gap-2 text-sm ${featured ? "text-background/80" : "text-muted-foreground"}`}
        >
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> {formatEventDate(event.starts_at)}
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" /> A partir das {formatEventTime(event.starts_at)}
          </p>
          {event.attraction && (
            <p className="flex items-center gap-2">
              <Music2 className="h-4 w-4" /> {event.attraction}
            </p>
          )}
        </div>

        {event.description && (
          <p
            className={`mt-4 text-sm ${featured ? "text-background/85" : "text-muted-foreground"}`}
          >
            {event.description}
          </p>
        )}

        {campaign && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-2xl p-3 ${featured ? "bg-background/10" : "bg-mango/55"}`}
          >
            <Gift className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em]">Mimo do evento</p>
              <p className="mt-0.5 text-sm font-semibold">{campaignBenefitLabel(campaign)}</p>
            </div>
          </div>
        )}

        {event.checkin_enabled && (
          <Link
            to="/checkin"
            className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-bold ${featured ? "bg-mango text-mango-foreground" : "bg-primary text-primary-foreground"}`}
          >
            Abrir meu check-in
          </Link>
        )}
      </div>
    </article>
  );
}
