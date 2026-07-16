import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gift,
  MapPin,
  MessageCircleMore,
  Music2,
  Sparkles,
} from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { FofocometroCard } from "@/components/customer/fofocometro-card";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { supabase } from "@/integrations/supabase/client";
import { campaignBenefitLabel, formatEventDate, formatEventTime } from "@/lib/bafafa";
import { withEffectiveEventStatus } from "@/lib/event-status";
import { useAuth } from "@/hooks/use-auth";
import { selectFofocometroGoal, type FofocometroGoal } from "@/lib/fofocometro";

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
  ends_at: string | null;
  checkin_enabled: boolean;
  status: string;
  chat_enabled: boolean;
  venue_address: string | null;
  campaigns?: CampaignPreview[] | null;
};

export const Route = createFileRoute("/_authenticated/eventos")({
  validateSearch: (search: Record<string, unknown>) => ({
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  component: Eventos,
});

function Eventos() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedEventIds, setCheckedEventIds] = useState<Set<string>>(new Set());
  const [goals, setGoals] = useState<FofocometroGoal[]>([]);
  const [showPast, setShowPast] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      await supabase.rpc("sync_event_statuses");
      const [eventsResult, checkinsResult, goalsResult] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,name,description,category,attraction,image_url,starts_at,ends_at,checkin_enabled,status,chat_enabled,venue_address,campaigns(id,name,benefit_type,discount_percent,fixed_off_cents,product_name)",
          )
          .in("status", ["scheduled", "published", "ongoing", "ended"])
          .order("starts_at", { ascending: true }),
        user
          ? supabase.from("checkins").select("event_id").eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("collective_goals")
          .select(
            "id,event_id,campaign_id,name,stage_order,target_count,current_count,status,starts_at,completed_at,reward_description",
          )
          .in("status", ["scheduled", "active", "completed"])
          .order("stage_order", { ascending: true }),
      ]);

      if (!mounted) return;
      const queryError = eventsResult.error ?? checkinsResult.error;
      if (queryError) setError(queryError.message);
      else {
        setEvents(
          ((eventsResult.data ?? []) as EventRow[]).map((event) => withEffectiveEventStatus(event)),
        );
        setCheckedEventIds(new Set((checkinsResult.data ?? []).map((row) => row.event_id)));
        setGoals(goalsResult.error ? [] : ((goalsResult.data ?? []) as FofocometroGoal[]));
      }
      setLoading(false);
    }

    void loadEvents();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshGoals = async () => {
      const { data: goalRows, error: goalsError } = await supabase
        .from("collective_goals")
        .select(
          "id,event_id,campaign_id,name,stage_order,target_count,current_count,status,starts_at,completed_at,reward_description",
        )
        .in("status", ["scheduled", "active", "completed"])
        .order("stage_order", { ascending: true });
      if (!goalsError) setGoals((goalRows ?? []) as FofocometroGoal[]);
    };
    const timer = window.setInterval(() => void refreshGoals(), 12_000);
    return () => window.clearInterval(timer);
  }, []);

  const now = clock;
  const current = useMemo(
    () =>
      events.filter((event) => {
        const starts = new Date(event.starts_at).getTime();
        const ends = event.ends_at
          ? new Date(event.ends_at).getTime()
          : starts + 8 * 60 * 60 * 1000;
        return event.status === "ongoing" || (starts <= now && ends >= now);
      }),
    [events, now],
  );
  const upcoming = useMemo(
    () =>
      events.filter(
        (event) =>
          !current.some((active) => active.id === event.id) &&
          new Date(event.starts_at).getTime() > now,
      ),
    [current, events, now],
  );
  const past = useMemo(
    () =>
      events
        .filter(
          (event) =>
            !current.some((active) => active.id === event.id) &&
            new Date(event.starts_at).getTime() <= now,
        )
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    [current, events, now],
  );

  return (
    <AppShell>
      <ScreenHeader eyebrow="Agenda do Bafafá" title="Eventos" tone="brick" />
      {loading && <LoadingCard label="Organizando a agenda…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-8 px-5 pt-2">
          {current.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-3xl">
                  <Sparkles className="h-6 w-6 text-samba" /> Rolando agora
                </h2>
                <span className="cut-label bg-samba text-white">é hoje</span>
              </div>
              {current.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  featured
                  current
                  checkedIn={checkedEventIds.has(event.id)}
                  initiallyExpanded={search.event === event.id}
                  goal={selectFofocometroGoal(goals, event.id)}
                />
              ))}
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-3xl">
                <CalendarDays className="h-6 w-6 text-primary" /> Próximos eventos
              </h2>
              {upcoming.length > 0 && <span className="cut-label bg-lagoa">{upcoming.length}</span>}
            </div>
            {upcoming.length === 0 ? (
              <div className="sticker-card bg-card p-5 text-sm font-semibold text-muted-foreground">
                A próxima fofoca ainda não foi publicada.
              </div>
            ) : (
              upcoming.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  featured={current.length === 0 && index === 0}
                  checkedIn={checkedEventIds.has(event.id)}
                  initiallyExpanded={search.event === event.id}
                  goal={selectFofocometroGoal(goals, event.id)}
                />
              ))
            )}
          </section>

          {past.length > 0 && (
            <section className="pb-3">
              <button
                type="button"
                onClick={() => setShowPast((value) => !value)}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-foreground/15 bg-muted px-4 py-3 text-left"
              >
                <div>
                  <p className="font-black">Eventos que já deram o que falar</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {past.length} no histórico
                  </p>
                </div>
                {showPast ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {showPast && (
                <div className="mt-3 space-y-2">
                  {past.slice(0, 12).map((event) => (
                    <article
                      key={event.id}
                      className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-card p-3 grayscale"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {event.image_url && (
                          <img
                            src={event.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black">{event.name}</p>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {formatEventDate(event.starts_at)} · {event.category}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
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
  current = false,
  checkedIn,
  initiallyExpanded,
  goal,
}: {
  event: EventRow;
  featured?: boolean;
  current?: boolean;
  checkedIn: boolean;
  initiallyExpanded: boolean;
  goal: FofocometroGoal | null;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded || featured);
  const campaign = event.campaigns?.[0];
  return (
    <article className={`${featured ? "poster-card" : "sticker-card"} overflow-hidden bg-card`}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="block w-full text-left"
      >
        <div className={`relative ${featured ? "aspect-[4/3]" : "aspect-[16/8]"} overflow-hidden`}>
          {event.image_url ? (
            <img src={event.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="brick-texture h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/20 to-transparent" />
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="cut-label bg-mango text-foreground">{event.category}</span>
            {current && <span className="cut-label bg-samba text-white">rolando agora</span>}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <h3 className={`${featured ? "text-5xl" : "text-4xl"} font-display leading-[.88]`}>
              {event.name}
            </h3>
            {event.attraction && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-white/90">
                <Music2 className="h-4 w-4 text-mango" /> {event.attraction}
              </p>
            )}
          </div>
        </div>
      </button>

      <div className="p-5">
        <div className="grid gap-2 text-sm font-semibold text-muted-foreground">
          <p className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-secondary" /> {formatEventDate(event.starts_at)} ·{" "}
            {formatEventTime(event.starts_at)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brick" />{" "}
            {event.venue_address ?? "Praça Dr. Amaro de Souza · Lagoa Nova"}
          </p>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4">
            {event.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
            )}
            {goal && <FofocometroCard goal={goal} compact />}
            {campaign && (
              <div className="ticket-card checker-texture p-4 text-foreground">
                <div className="flex items-start gap-3">
                  <Gift className="mt-0.5 h-6 w-6 shrink-0" />
                  <div>
                    <p className="section-kicker">Promoção do evento</p>
                    <p className="mt-1 font-poster text-base">{campaignBenefitLabel(campaign)}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {event.checkin_enabled && !checkedIn && (
                <Link
                  to="/checkin"
                  search={{ event: event.id }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
                >
                  Já tô no Bafafá <MapPin className="h-4 w-4" />
                </Link>
              )}
              {checkedIn && event.checkin_enabled && (
                <Link
                  to="/checkin"
                  search={{ event: event.id }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-mango px-4 py-3 text-sm font-black text-foreground shadow-[3px_4px_0_var(--foreground)]"
                >
                  Validar promoções <Gift className="h-4 w-4" />
                </Link>
              )}
              {checkedIn && event.chat_enabled && (
                <Link
                  to="/resenha"
                  search={{ event: event.id }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-samba px-4 py-3 text-sm font-black text-white shadow-[3px_4px_0_var(--foreground)]"
                >
                  Entrar na Resenha <MessageCircleMore className="h-4 w-4" />
                </Link>
              )}
              {checkedIn && (
                <div className="rounded-xl border-2 border-primary/25 bg-primary/10 px-4 py-3 text-center text-sm font-black text-primary sm:col-span-2">
                  Presença confirmada ✓
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1 text-xs font-black text-muted-foreground"
        >
          {expanded ? "Mostrar menos" : "Ver detalhes"}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}
