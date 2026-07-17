import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Gift,
  MapPin,
  Megaphone,
  MessageCircleMore,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { FofocometroCard } from "@/components/customer/fofocometro-card";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { campaignBenefitLabel } from "@/lib/bafafa";
import { selectFofocometroGoal, type FofocometroGoal } from "@/lib/fofocometro";
import { parseHouseSession, type HouseSession } from "@/lib/house-session";
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
  public_title: string | null;
  public_copy: string | null;
  home_sort_order: number | null;
  home_visible: boolean;
  redemption_mode: "app" | "external" | "both";
  external_url: string | null;
  external_button_label: string;
  external_open_new_tab: boolean;
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
  posts: FeedPost[];
  goals: FofocometroGoal[];
  houseSession: HouseSession | null;
};

const EMPTY: HomeData = {
  displayName: "Bafafã",
  completion: { percentage: 0, items: [], next_key: null },
  promotions: [],
  posts: [],
  goals: [],
  houseSession: null,
};

function Inicio() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    await supabase.rpc("sync_event_statuses");

    const [profile, completion, promotions, posts, goals, houseSession] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.rpc("my_profile_completion_details"),
      supabase.rpc("my_fofoquinhas"),
      supabase
        .from("feed_posts")
        .select("id,post_type,title,body,image_url,starts_at,is_pinned,priority,placement")
        .eq("status", "published")
        .lte("starts_at", new Date().toISOString())
        .order("is_pinned", { ascending: false })
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false })
        .limit(30),
      supabase
        .from("collective_goals")
        .select(
          "id,event_id,campaign_id,name,stage_order,target_count,current_count,status,starts_at,completed_at,reward_description",
        )
        .in("status", ["scheduled", "active", "completed"])
        .order("stage_order", { ascending: true }),
      supabase.rpc("my_house_session"),
    ]);

    const publicModulesFailed = Boolean(posts.error && promotions.error);
    if (publicModulesFailed) {
      setError(
        posts.error?.message ?? promotions.error?.message ?? "Não foi possível carregar o feed.",
      );
    } else {
      if (goals.error) console.warn("Fofocômetro indisponível:", goals.error.message);
      if (houseSession.error)
        console.warn("Sessão da Casa indisponível:", houseSession.error.message);
      setData({
        displayName:
          profile.data?.display_name ??
          (user.user_metadata?.display_name as string | undefined) ??
          "Bafafã",
        completion: completion.error ? EMPTY.completion : parseProfileCompletion(completion.data),
        promotions: promotions.error
          ? []
          : sortPromotions((promotions.data ?? []) as unknown as Promo[]),
        posts: posts.error ? [] : ((posts.data ?? []) as FeedPost[]),
        goals: goals.error ? [] : ((goals.data ?? []) as FofocometroGoal[]),
        houseSession: houseSession.error ? null : parseHouseSession(houseSession.data),
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => void load(), [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const currentGoal = useMemo(
    () => (data.houseSession ? selectFofocometroGoal(data.goals, data.houseSession.id) : null),
    [data.goals, data.houseSession],
  );

  const postsByPlacement = useMemo(
    () => ({
      top: data.posts.filter((post) => post.placement === "top"),
      afterPromotions: data.posts.filter((post) =>
        ["after_promotions", "after_current_event", "after_events"].includes(post.placement),
      ),
      bottom: data.posts.filter((post) => post.placement === "bottom"),
    }),
    [data.posts],
  );

  const firstName = data.displayName.split(" ")[0] || "Bafafã";
  const nextTask = nextProfileTask(data.completion);

  function openExternalPromotion(promo: Promo, source: "home" | "fofoquinhas" = "home") {
    if (!promo.external_url) return;
    void supabase
      .rpc("track_campaign_external_click", {
        _campaign_id: promo.campaign_id,
        _source: source,
      })
      .then(({ error: trackingError }) => {
        if (trackingError)
          console.warn("Não foi possível registrar o clique:", trackingError.message);
      });

    if (promo.external_open_new_tab) {
      window.open(promo.external_url, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(promo.external_url);
    }
  }

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
          <FeedPostsSection posts={postsByPlacement.top} />

          {data.houseSession && <HouseSessionCard session={data.houseSession} />}

          {data.promotions.length > 0 && (
            <section className="space-y-3">
              <FeedSectionTitle icon={Megaphone} title="Fofoquinhas no ar" badge="tá valendo" />
              {data.promotions.slice(0, 5).map((promo, index) => (
                <PromotionCard
                  key={promo.campaign_id}
                  promo={promo}
                  featured={index === 0}
                  onExternal={() => openExternalPromotion(promo)}
                />
              ))}
              {data.promotions.length > 5 && (
                <Link to="/mimos" className="feed-more-link">
                  Ver todas as Fofoquinhas <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </section>
          )}

          {currentGoal && (
            <section className="space-y-3">
              <FeedSectionTitle icon={Megaphone} title="Meta da galera" badge="ao vivo" />
              <FofocometroCard goal={currentGoal} />
            </section>
          )}

          <FeedPostsSection posts={postsByPlacement.afterPromotions} />

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
                  {nextTask.label}. Complete e deixe seu perfil com a sua cara.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>
          )}

          <FeedPostsSection posts={postsByPlacement.bottom} />

          {!data.houseSession && data.promotions.length === 0 && data.posts.length === 0 && (
            <section className="poster-card checker-texture p-6 text-foreground">
              <Sparkles className="h-8 w-8" />
              <h2 className="mt-4 font-display text-4xl leading-none">
                A fofoca ainda está sendo apurada.
              </h2>
              <p className="mt-3 text-sm font-semibold opacity-75">
                Fofoquinhas e novidades publicadas pela equipe vão aparecer aqui.
              </p>
            </section>
          )}
        </main>
      )}
    </AppShell>
  );
}

function sortPromotions(promotions: Promo[]) {
  const kindOrder: Record<string, number> = { global: 0, milestone: 1, event: 2 };
  return promotions
    .filter((promo) => promo.campaign_kind !== "event" && promo.home_visible)
    .sort((a, b) => {
      const aManual = a.home_sort_order !== null;
      const bManual = b.home_sort_order !== null;
      if (aManual !== bManual) return aManual ? -1 : 1;
      if (aManual && bManual && a.home_sort_order !== b.home_sort_order) {
        return Number(a.home_sort_order) - Number(b.home_sort_order);
      }
      const kindDifference = (kindOrder[a.campaign_kind] ?? 9) - (kindOrder[b.campaign_kind] ?? 9);
      if (kindDifference !== 0) return kindDifference;
      return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
    });
}

function HouseSessionCard({ session }: { session: HouseSession }) {
  if (session.checked_in) {
    return (
      <section className="poster-card grid-texture bg-primary p-5 text-primary-foreground">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-8 w-8 shrink-0" />
          <div>
            <p className="section-kicker opacity-75">Presença confirmada</p>
            <h2 className="mt-1 font-display text-4xl leading-none">A Resenha tá aberta.</h2>
            <p className="mt-3 text-sm font-semibold opacity-85">
              Entre para conversar com quem já chegou ao Bafafá.
            </p>
          </div>
        </div>
        <Link
          to="/resenha"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background px-4 py-3 text-sm font-black text-foreground shadow-[3px_4px_0_var(--foreground)]"
        >
          Entrar na Resenha <MessageCircleMore className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  if (!session.checkin_open) return null;

  return (
    <section className="poster-card checker-texture p-5 text-foreground">
      <div className="flex items-start gap-3">
        <MapPin className="h-8 w-8 shrink-0" />
        <div>
          <p className="section-kicker opacity-65">A casa está aberta</p>
          <h2 className="mt-1 font-display text-4xl leading-none">Já tá no Bafafá?</h2>
          <p className="mt-3 text-sm font-semibold opacity-75">
            Confirme sua presença para entrar na Resenha e liberar as vantagens da casa.
          </p>
        </div>
      </div>
      <Link
        to="/checkin"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
      >
        Confirmar minha presença <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
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

function PromotionCard({
  promo,
  featured,
  onExternal,
}: {
  promo: Promo;
  featured?: boolean;
  onExternal: () => void;
}) {
  const progress = Math.min(
    100,
    Math.round((promo.progress_value / Math.max(promo.trigger_target, 1)) * 100),
  );
  const benefit = campaignBenefitLabel(promo);
  const hasReward = promo.reward_status === "available";
  const appEnabled = promo.redemption_mode !== "external";
  const externalEnabled = promo.redemption_mode !== "app" && Boolean(promo.external_url);

  return (
    <article
      className={`${featured ? "poster-card checker-texture" : "ticket-card bg-card"} overflow-hidden p-5 text-foreground`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-kicker opacity-65">
            {promo.campaign_kind === "milestone" ? "Missão do clube" : "Promoção aberta"}
          </p>
          <h3
            className={`${featured ? "text-4xl" : "text-3xl"} mt-1 break-words font-display leading-none`}
          >
            {promo.public_title || promo.name}
          </h3>
        </div>
        <Gift className="h-7 w-7 shrink-0" />
      </div>
      <p className="mt-3 font-poster text-lg">{benefit}</p>
      {(promo.public_copy || promo.description) && (
        <p className="mt-2 text-sm font-semibold opacity-70">
          {promo.public_copy || promo.description}
        </p>
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
      <div className={`mt-5 grid gap-2 ${appEnabled && externalEnabled ? "sm:grid-cols-2" : ""}`}>
        {appEnabled && (
          <Link
            to="/mimos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-card px-4 py-3 text-sm font-black"
          >
            {hasReward ? "Usar Fofoquinha" : "Ver detalhes"} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {externalEnabled && (
          <button
            type="button"
            onClick={onExternal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
          >
            {promo.external_button_label || "Garantir promoção"}{" "}
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}
