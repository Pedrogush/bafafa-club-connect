import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Gift,
  MapPin,
  Megaphone,
  MessageCircleMore,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  CustomerJourneySection,
  type CustomerJourney,
} from "@/components/customer/customer-journey";
import { FofocometroCard } from "@/components/customer/fofocometro-card";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { campaignBenefitLabel, formatEventDate, formatEventTime } from "@/lib/bafafa";
import { withEffectiveEventStatus } from "@/lib/event-status";
import { selectFofocometroGoal, type FofocometroGoal } from "@/lib/fofocometro";
import {
  nextProfileTask,
  parseProfileCompletion,
  type ProfileCompletionDetails,
} from "@/lib/profile-completion";

export const Route = createFileRoute("/_authenticated/inicio")({ component: Inicio });

type Promo = {
  campaign_id: string;
  name: string;
  description: string | null;
  benefit_type: string;
  discount_percent: number | null;
  fixed_off_cents: number | null;
  product_name: string | null;
  public_rules: string | null;
  campaign_kind: string;
  trigger_type: string;
  trigger_target: number;
  progress_value: number;
  completed: boolean;
  reward_id: string | null;
  reward_status: string | null;
  reward_expires_at: string | null;
  starts_at: string;
  ends_at: string | null;
  is_pinned: boolean;
  feed_priority: number;
};

type EventFeed = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  attraction: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  checkin_enabled: boolean;
  chat_enabled: boolean;
};

type FeedPost = {
  id: string;
  post_type: string;
  title: string;
  body: string | null;
  image_url: string | null;
  starts_at: string;
  is_pinned: boolean;
  priority: number;
  placement: "top" | "after_promotions" | "after_current_event" | "after_events" | "bottom";
};

type HomeData = {
  displayName: string;
  completion: ProfileCompletionDetails;
  promotions: Promo[];
  events: EventFeed[];
  posts: FeedPost[];
  goals: FofocometroGoal[];
  journey: CustomerJourney | null;
};

const EMPTY: HomeData = {
  displayName: "Bafafã",
  completion: { percentage: 0, items: [], next_key: null },
  promotions: [],
  events: [],
  posts: [],
  goals: [],
  journey: null,
};

function Inicio() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    await supabase.rpc("sync_event_statuses");
    const [profile, completion, promotions, events, posts, goals, journey] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.rpc("my_profile_completion_details"),
      supabase.rpc("my_fofoquinhas"),
      supabase
        .from("events")
        .select(
          "id,name,description,category,attraction,image_url,starts_at,ends_at,status,checkin_enabled,chat_enabled",
        )
        .in("status", ["published", "scheduled", "ongoing", "ended"])
        .order("starts_at", { ascending: true })
        .limit(20),
      supabase
        .from("feed_posts")
        .select("id,post_type,title,body,image_url,starts_at,is_pinned,priority,placement")
        .eq("status", "published")
        .lte("starts_at", new Date().toISOString())
        .order("is_pinned", { ascending: false })
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false })
        .limit(20),
      supabase
        .from("collective_goals")
        .select(
          "id,event_id,campaign_id,name,stage_order,target_count,current_count,status,starts_at,completed_at,reward_description",
        )
        .in("status", ["scheduled", "active", "completed"])
        .order("stage_order", { ascending: true }),
      supabase.rpc("my_event_journey"),
    ]);

    const publicModulesFailed = Boolean(events.error && posts.error && promotions.error);
    if (publicModulesFailed) {
      setError(
        events.error?.message ??
          posts.error?.message ??
          promotions.error?.message ??
          "Não foi possível carregar o feed.",
      );
    } else {
      if (journey.error)
        console.warn("Jornada indisponível, mantendo o feed público:", journey.error.message);
      if (goals.error) console.warn("Fofocômetro indisponível:", goals.error.message);
      setData({
        displayName:
          profile.data?.display_name ??
          (user.user_metadata?.display_name as string | undefined) ??
          "Bafafã",
        completion: completion.error ? EMPTY.completion : parseProfileCompletion(completion.data),
        promotions: promotions.error ? [] : ((promotions.data ?? []) as Promo[]),
        events: events.error
          ? []
          : ((events.data ?? []) as EventFeed[]).map((event) => withEffectiveEventStatus(event)),
        posts: posts.error ? [] : ((posts.data ?? []) as FeedPost[]),
        goals: goals.error ? [] : ((goals.data ?? []) as FofocometroGoal[]),
        journey: journey.error ? null : ((journey.data as CustomerJourney | null) ?? null),
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => void load(), [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshGoals = async () => {
      const { data: goals, error: goalsError } = await supabase
        .from("collective_goals")
        .select(
          "id,event_id,campaign_id,name,stage_order,target_count,current_count,status,starts_at,completed_at,reward_description",
        )
        .in("status", ["scheduled", "active", "completed"])
        .order("stage_order", { ascending: true });
      if (!goalsError) {
        setData((current) => ({
          ...current,
          goals: (goals ?? []) as FofocometroGoal[],
        }));
      }
    };
    const timer = window.setInterval(() => void refreshGoals(), 12_000);
    return () => window.clearInterval(timer);
  }, []);

  const now = clock;
  const currentEvent = useMemo(
    () =>
      data.events.find((event) => {
        const starts = new Date(event.starts_at).getTime();
        const ends = event.ends_at
          ? new Date(event.ends_at).getTime()
          : starts + 8 * 60 * 60 * 1000;
        return event.status === "ongoing" || (starts <= now && ends >= now);
      }) ?? null,
    [data.events, now],
  );
  const futureEvents = useMemo(
    () =>
      data.events.filter(
        (event) => event.id !== currentEvent?.id && new Date(event.starts_at).getTime() > now,
      ),
    [currentEvent?.id, data.events, now],
  );
  const nextEvent = futureEvents[0] ?? null;
  const moreEvents = futureEvents.slice(1, 4);
  const currentGoal = useMemo(
    () => (currentEvent ? selectFofocometroGoal(data.goals, currentEvent.id) : null),
    [currentEvent, data.goals],
  );
  const postsByPlacement = useMemo(
    () => ({
      top: data.posts.filter((post) => post.placement === "top"),
      afterPromotions: data.posts.filter((post) => post.placement === "after_promotions"),
      afterCurrentEvent: data.posts.filter((post) => post.placement === "after_current_event"),
      afterEvents: data.posts.filter((post) => post.placement === "after_events"),
      bottom: data.posts.filter((post) => post.placement === "bottom"),
    }),
    [data.posts],
  );
  const firstName = data.displayName.split(" ")[0] || "Bafafã";
  const nextTask = nextProfileTask(data.completion);

  return (
    <AppShell>
      <header className="relative overflow-hidden border-b-2 border-foreground bg-background px-5 pb-5 pt-5">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-mango/50 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="section-kicker text-muted-foreground">Feed oficial do Bafafá</p>
            <h1 className="mt-1 truncate font-display text-4xl leading-none">Ô, {firstName}!</h1>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-brick" /> Praça Dr. Amaro de Souza · Lagoa Nova
            </p>
          </div>
          <img
            src="/brand/logo-bafafa.png"
            alt="Bafafá"
            className="h-16 w-24 shrink-0 object-contain drop-shadow-[2px_3px_0_rgba(20,16,40,.18)]"
          />
        </div>
      </header>

      {loading ? (
        <LoadingCard label="Puxando as novidades…" />
      ) : error ? (
        <div className="space-y-3">
          <ErrorCard message={error} />
          <div className="px-5">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <main className="space-y-7 px-5 pt-5">
          <CustomerJourneySection
            journey={data.journey}
            promotions={data.promotions}
            onReviewed={() => void load()}
          />

          <FeedPostsSection posts={postsByPlacement.top} />

          {data.promotions.length > 0 && (
            <section className="space-y-3">
              <FeedSectionTitle icon={Megaphone} title="Fofoquinhas no ar" badge="tá valendo" />
              {data.promotions.slice(0, 3).map((promo, index) => (
                <PromotionCard key={promo.campaign_id} promo={promo} featured={index === 0} />
              ))}
              {data.promotions.length > 3 && (
                <Link to="/mimos" className="feed-more-link">
                  Ver todas as Fofoquinhas <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </section>
          )}

          <FeedPostsSection posts={postsByPlacement.afterPromotions} />

          {currentEvent && (
            <section className="space-y-3">
              <FeedSectionTitle icon={Sparkles} title="Rolando agora" badge="é hoje" />
              <EventFeedCard
                event={currentEvent}
                current
                checkedIn={Boolean(
                  data.journey?.checked_in && data.journey.event?.id === currentEvent.id,
                )}
              />
            </section>
          )}

          {currentGoal && (
            <section className="space-y-3">
              <FeedSectionTitle icon={Megaphone} title="Meta da galera" badge="ao vivo" />
              <FofocometroCard goal={currentGoal} />
            </section>
          )}

          <FeedPostsSection posts={postsByPlacement.afterCurrentEvent} />

          {nextEvent && (
            <section className="space-y-3">
              <FeedSectionTitle icon={CalendarDays} title="Próximo evento" />
              <EventFeedCard event={nextEvent} />
            </section>
          )}

          {moreEvents.length > 0 && (
            <section className="space-y-3">
              <FeedSectionTitle icon={CalendarDays} title="Próximos eventos" />
              <div className="space-y-3">
                {moreEvents.map((event) => (
                  <CompactEventCard key={event.id} event={event} />
                ))}
              </div>
              <Link to="/eventos" search={{ event: undefined }} className="feed-more-link">
                Ver agenda completa <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          )}

          <FeedPostsSection posts={postsByPlacement.afterEvents} />

          {data.completion.percentage < 100 && nextTask && (
            <Link to="/perfil" className="sticker-card flex items-center gap-3 bg-card p-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-foreground bg-mango shadow-[2px_3px_0_var(--foreground)]">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black">
                  Sua carteirinha está {data.completion.percentage}% pronta
                </p>
                <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  {nextTask.label}. Complete e fortaleça seu perfil no clube.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>
          )}

          <FeedPostsSection posts={postsByPlacement.bottom} />

          {!currentEvent &&
            !nextEvent &&
            data.promotions.length === 0 &&
            data.posts.length === 0 && (
              <section className="poster-card checker-texture p-6 text-foreground">
                <Sparkles className="h-8 w-8" />
                <h2 className="mt-4 font-display text-4xl leading-none">
                  A fofoca ainda está sendo apurada.
                </h2>
                <p className="mt-3 text-sm font-semibold opacity-75">
                  Promoções, eventos e novidades publicadas pela equipe vão aparecer aqui.
                </p>
              </section>
            )}
        </main>
      )}
    </AppShell>
  );
}

function FeedPostsSection({ posts }: { posts: FeedPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="space-y-4">
      <FeedSectionTitle icon={MessageCircleMore} title="Direto do Bafafá" />
      {posts.map((post) => (
        <article key={post.id} className="sticker-card overflow-hidden bg-card">
          {post.image_url && (
            <img src={post.image_url} alt="" className="aspect-[16/9] w-full object-cover" />
          )}
          <div className="p-5">
            <span className="cut-label bg-lagoa text-foreground">
              {post.post_type === "photo"
                ? "álbum"
                : post.post_type === "notice"
                  ? "aviso"
                  : post.post_type === "behind_scenes"
                    ? "bastidor"
                    : "novidade"}
            </span>
            <h2 className="mt-4 font-display text-3xl leading-none">{post.title}</h2>
            {post.body && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {post.body}
              </p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function FeedSectionTitle({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof Sparkles;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-2xl leading-none">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      {badge && <span className="cut-label bg-mango text-foreground">{badge}</span>}
    </div>
  );
}

function PromotionCard({ promo, featured }: { promo: Promo; featured?: boolean }) {
  const progress = Math.min(
    100,
    Math.round((promo.progress_value / Math.max(promo.trigger_target, 1)) * 100),
  );
  const benefit = campaignBenefitLabel(promo);
  const hasReward = promo.reward_status === "available";
  return (
    <Link
      to="/mimos"
      className={`${featured ? "poster-card checker-texture" : "ticket-card bg-card"} block overflow-hidden p-5 text-foreground`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-kicker opacity-65">
            {promo.campaign_kind === "milestone" ? "Missão do clube" : "Promoção ativa"}
          </p>
          <h3
            className={`${featured ? "text-4xl" : "text-3xl"} mt-1 break-words font-display leading-none`}
          >
            {promo.name}
          </h3>
        </div>
        <Gift className="h-7 w-7 shrink-0" />
      </div>
      <p className="mt-3 font-poster text-lg">{benefit}</p>
      {promo.description && (
        <p className="mt-2 text-sm font-semibold opacity-70">{promo.description}</p>
      )}
      {promo.campaign_kind === "milestone" && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-black">
            <span>
              {hasReward
                ? "Liberada para você"
                : `${promo.progress_value} de ${promo.trigger_target}`}
            </span>
            <span>{hasReward ? "✓" : `${progress}%`}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-white/65">
            <div
              className="h-full bg-primary"
              style={{ width: `${hasReward ? 100 : progress}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

function EventFeedCard({
  event,
  current = false,
  checkedIn = false,
}: {
  event: EventFeed;
  current?: boolean;
  checkedIn?: boolean;
}) {
  return (
    <article className="poster-card overflow-hidden bg-foreground text-background">
      <div className="relative min-h-[280px]">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="brick-texture absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/35 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span
            className={`cut-label ${current ? "bg-samba text-white" : "bg-mango text-foreground"}`}
          >
            {current ? "rolando agora" : event.category}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="break-words font-display text-5xl leading-[.88]">{event.name}</h3>
          {event.attraction && <p className="mt-2 font-black text-mango">{event.attraction}</p>}
          <p className="mt-3 flex items-center gap-2 text-sm font-bold text-white/85">
            <Clock3 className="h-4 w-4" /> {formatEventDate(event.starts_at)} ·{" "}
            {formatEventTime(event.starts_at)}
          </p>
        </div>
      </div>
      <div className="grid gap-2 border-t-2 border-foreground bg-background p-4 text-foreground sm:grid-cols-2">
        <Link
          to="/eventos"
          search={{ event: event.id }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-card px-4 py-3 text-sm font-black"
        >
          Ver evento <ArrowRight className="h-4 w-4" />
        </Link>
        {current && event.checkin_enabled && !checkedIn && (
          <Link
            to="/checkin"
            search={{ event: event.id }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
          >
            Já tô no Bafafá <MapPin className="h-4 w-4" />
          </Link>
        )}
        {current && checkedIn && (
          <div className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/10 px-4 py-3 text-sm font-black text-primary">
            Presença confirmada ✓
          </div>
        )}
      </div>
    </article>
  );
}

function CompactEventCard({ event }: { event: EventFeed }) {
  return (
    <Link
      to="/eventos"
      search={{ event: event.id }}
      className="sticker-card flex items-center gap-3 bg-card p-3"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-foreground/20 bg-electric">
        {event.image_url && (
          <img src={event.image_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="section-kicker text-muted-foreground">{event.category}</p>
        <h3 className="truncate font-display text-2xl leading-none">{event.name}</h3>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0" />
    </Link>
  );
}
