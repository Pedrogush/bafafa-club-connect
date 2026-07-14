import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Gift,
  MapPin,
  MessageCircleMore,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompactBadgeMark, type BafafaBadgeDefinition } from "@/components/profile/bafafa-badge";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { campaignBenefitLabel, formatEventDate, formatEventTime } from "@/lib/bafafa";
import {
  nextProfileTask,
  parseProfileCompletion,
  type ProfileCompletionDetails,
} from "@/lib/profile-completion";

type HomeData = {
  displayName: string;
  completion: ProfileCompletionDetails;
  event: {
    id: string;
    name: string;
    starts_at: string;
    attraction: string | null;
    image_url: string | null;
    category: string;
    checkin_enabled: boolean;
    campaigns?: Array<{
      name: string;
      benefit_type: string;
      discount_percent: number | null;
      fixed_off_cents: number | null;
      product_name: string | null;
    }> | null;
  } | null;
  availableRewards: number;
  checkins: number;
  latestBadge: BafafaBadgeDefinition | null;
  chatRoom: {
    event_id: string;
    event_name: string;
    message_count: number;
  } | null;
};

const EMPTY_HOME: HomeData = {
  displayName: "Bafafã",
  completion: { percentage: 0, items: [], next_key: null },
  event: null,
  availableRewards: 0,
  checkins: 0,
  latestBadge: null,
  chatRoom: null,
};

export const Route = createFileRoute("/_authenticated/inicio")({
  component: Inicio,
});

function Inicio() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData>(EMPTY_HOME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const now = new Date().toISOString();
    const [profile, completion, event, rewards, checkins, badges, chatRooms] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.rpc("my_profile_completion_details"),
      supabase
        .from("events")
        .select(
          "id,name,starts_at,attraction,image_url,category,checkin_enabled,campaigns(name,benefit_type,discount_percent,fixed_off_cents,product_name)",
        )
        .in("status", ["scheduled", "ongoing"])
        .gte("starts_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("user_rewards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "available")
        .or(`expires_at.is.null,expires_at.gt.${now}`),
      supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("user_badges")
        .select("awarded_at,badge_definitions(slug,name,description,icon)")
        .eq("user_id", user.id)
        .eq("is_hidden", false)
        .order("awarded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("my_event_chat_rooms"),
    ]);

    const criticalError = profile.error ?? completion.error ?? event.error;
    if (criticalError) {
      setError(criticalError.message);
      setLoading(false);
      return;
    }

    const badgeData = badges.data as unknown as {
      badge_definitions: BafafaBadgeDefinition | null;
    } | null;

    setData({
      displayName:
        profile.data?.display_name ??
        (user.user_metadata?.display_name as string | undefined) ??
        "Bafafã",
      completion: parseProfileCompletion(completion.data),
      event: (event.data as unknown as HomeData["event"]) ?? null,
      availableRewards: rewards.count ?? 0,
      checkins: checkins.count ?? 0,
      latestBadge: badgeData?.badge_definitions ?? null,
      chatRoom: chatRooms.data?.[0]
        ? {
            event_id: chatRooms.data[0].event_id,
            event_name: chatRooms.data[0].event_name,
            message_count: Number(chatRooms.data[0].message_count ?? 0),
          }
        : null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = data.displayName.split(" ")[0] || "Bafafã";
  const campaign = data.event?.campaigns?.[0];
  const nextTask = nextProfileTask(data.completion);

  return (
    <AppShell>
      <header className="home-hero relative overflow-hidden px-5 pb-7 pt-5">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-mango/70 blur-3xl" />
        <div className="absolute -left-20 top-16 h-40 w-40 rounded-full bg-samba/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-16 opacity-30">
          <div className="plaza-line absolute inset-x-0 bottom-1 text-electric" />
        </div>

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="bafafa-sign" aria-label="Bafafá Bar">
              <span className="bafafa-sign__nail bafafa-sign__nail--left" aria-hidden="true" />
              <span className="bafafa-sign__nail bafafa-sign__nail--right" aria-hidden="true" />
              <img
                src="/brand/logo-bafafa.png"
                alt="Bafafá Bar"
                className="relative z-10 h-auto w-full object-contain"
              />
            </div>
            <p className="home-hero__institutional">Clube dos Bafafãs · Natal/RN</p>
          </div>
          <span className="home-hero__official-badge">clube oficial</span>
        </div>

        <div className="home-hero__copy relative mt-7">
          <span className="home-hero__invitation">Chegue mais, Bafafã</span>
          <h1 className="home-hero__greeting mt-4">
            <span>Ô, {firstName}!</span>
            <span className="home-hero__asterisk" aria-hidden="true">
              *
            </span>
          </h1>
          <p className="home-hero__location mt-4">
            <MapPin className="h-4 w-4 shrink-0 text-brick" />
            <span>Praça Dr. Amaro de Souza · Lagoa Nova</span>
          </p>
        </div>
      </header>

      {loading ? (
        <LoadingCard label="Organizando as novidades do clube…" />
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
        <div className="space-y-5 px-5">
          {data.event ? (
            <section className="poster-card bg-foreground text-background">
              <div className="relative min-h-[330px]">
                {data.event.image_url ? (
                  <img
                    src={data.event.image_url}
                    alt={`Imagem do evento ${data.event.name}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="brick-texture absolute inset-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/55 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
                  <span className="cut-label max-w-full bg-mango text-foreground">
                    {data.event.category}
                  </span>
                  <span className="cut-label rotate-[2deg] bg-white text-foreground">
                    agenda do bafafá
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 min-w-0 p-5">
                  <p className="section-kicker text-background/70">Próximo rolê</p>
                  <h2 className="mt-1 break-words font-display text-5xl leading-[0.86]">
                    {data.event.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-background/90">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-mango" />
                      {formatEventDate(data.event.starts_at)} ·{" "}
                      {formatEventTime(data.event.starts_at)}
                    </p>
                    {data.event.attraction && (
                      <p className="break-words">Som: {data.event.attraction}</p>
                    )}
                  </div>
                </div>
              </div>

              {campaign && (
                <div className="checker-texture border-t-[3px] border-foreground p-4 text-foreground">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="section-kicker">Check-in vale mimo</p>
                      <p className="mt-1 break-words font-poster text-lg leading-tight">
                        {campaignBenefitLabel(campaign)}
                      </p>
                    </div>
                    <Gift className="h-7 w-7 shrink-0" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 border-t-[3px] border-foreground bg-background text-foreground">
                <Link
                  to="/eventos"
                  className="flex min-w-0 items-center justify-center gap-1.5 border-r-2 border-foreground px-2 py-3 text-center text-sm font-black"
                >
                  Ver agenda <ArrowUpRight className="h-4 w-4 shrink-0" />
                </Link>
                <Link
                  to="/checkin"
                  className="flex min-w-0 items-center justify-center gap-1.5 bg-primary px-2 py-3 text-center text-sm font-black text-primary-foreground"
                >
                  Fazer check-in <Sparkles className="h-4 w-4 shrink-0" />
                </Link>
              </div>
            </section>
          ) : (
            <section className="poster-card brick-texture p-6 text-white">
              <span className="cut-label bg-mango text-foreground">agenda</span>
              <h2 className="mt-5 break-words font-display text-4xl leading-none">
                A fofoca do próximo rolê ainda não vazou.
              </h2>
              <p className="mt-3 max-w-sm text-sm font-semibold text-white/90">
                Assim que o evento for publicado, ele aparece bem aqui.
              </p>
            </section>
          )}

          <Link to="/perfil" className="sticker-card block overflow-hidden bg-card p-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 rotate-[-4deg] place-items-center rounded-full border-2 border-foreground bg-lagoa text-foreground">
                  <UserRound className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="section-kicker text-muted-foreground">Sua carteirinha</p>
                  <p className="truncate font-poster text-lg">
                    Perfil {data.completion.percentage}% completo
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0" />
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-foreground bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.completion.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {data.completion.percentage >= 100
                ? "Perfil no grau. Agora é só acumular história e selo."
                : nextTask
                  ? `Próxima etapa: ${nextTask.label} (+${nextTask.weight}%).`
                  : "Conta mais uma fofoca e desbloqueie novos selos."}
            </p>
          </Link>

          {data.chatRoom && (
            <Link
              to="/resenha"
              search={{ event: data.chatRoom.event_id }}
              className="poster-card grid-texture flex min-w-0 items-center justify-between gap-4 bg-samba p-5 text-white"
            >
              <div className="min-w-0">
                <p className="section-kicker text-white/70">Resenha liberada</p>
                <p className="mt-1 truncate font-display text-3xl leading-none">
                  {data.chatRoom.event_name}
                </p>
                <p className="mt-2 text-xs font-black uppercase text-white/75">
                  {data.chatRoom.message_count} mensagens na roda
                </p>
              </div>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-foreground bg-mango text-foreground shadow-[3px_4px_0_var(--foreground)]">
                <MessageCircleMore className="h-7 w-7" />
              </span>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Link to="/mimos" className="sticker-card checker-texture min-w-0 p-4 text-foreground">
              <Gift className="h-6 w-6" />
              <p className="mt-3 font-display text-5xl leading-none">{data.availableRewards}</p>
              <p className="mt-1 break-words text-xs font-black uppercase">mimos disponíveis</p>
            </Link>
            <div className="sticker-card grid-texture min-w-0 bg-electric p-4 text-white">
              <CheckCircle2 className="h-6 w-6" />
              <p className="mt-3 font-display text-5xl leading-none">{data.checkins}</p>
              <p className="mt-1 break-words text-xs font-black uppercase">check-ins feitos</p>
            </div>
          </div>

          {data.latestBadge && (
            <section className="sticker-card flex min-w-0 items-center gap-4 overflow-hidden bg-lagoa p-4 text-foreground">
              <CompactBadgeMark
                badge={data.latestBadge}
                className="h-14 w-14 shrink-0 border-[3px] shadow-[3px_3px_0_var(--foreground)]"
              />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="section-kicker truncate opacity-70">Selo novo na coleção</p>
                <p className="mt-1 truncate font-poster text-xl leading-tight">
                  {data.latestBadge.name}
                </p>
                {data.latestBadge.description && (
                  <p className="mt-1 line-clamp-2 break-words text-xs font-semibold leading-relaxed opacity-75">
                    {data.latestBadge.description}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
