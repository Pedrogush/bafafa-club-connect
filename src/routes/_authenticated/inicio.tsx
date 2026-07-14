import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Gift,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Wordmark } from "@/components/brand/wordmark";
import { BadgeSticker, type BafafaBadgeDefinition } from "@/components/profile/bafafa-badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { campaignBenefitLabel, formatEventDate, formatEventTime } from "@/lib/bafafa";

type HomeData = {
  displayName: string;
  completeness: number;
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
};

export const Route = createFileRoute("/_authenticated/inicio")({
  component: Inicio,
});

function Inicio() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData>({
    displayName: "Bafafã",
    completeness: 0,
    event: null,
    availableRewards: 0,
    checkins: 0,
    latestBadge: null,
  });

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const now = new Date().toISOString();
      const [profile, completeness, event, rewards, checkins, badges] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle(),
        supabase.rpc("my_profile_completeness"),
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
          .eq("status", "available")
          .or(`expires_at.is.null,expires_at.gt.${now}`),
        supabase.from("checkins").select("id", { count: "exact", head: true }),
        supabase
          .from("user_badges")
          .select("awarded_at,badge_definitions(slug,name,description,icon)")
          .eq("is_hidden", false)
          .order("awarded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      const badgeData = badges.data as unknown as {
        badge_definitions: BafafaBadgeDefinition | null;
      } | null;
      setData({
        displayName:
          profile.data?.display_name ??
          (user?.user_metadata?.display_name as string | undefined) ??
          "Bafafã",
        completeness: typeof completeness.data === "number" ? completeness.data : 0,
        event: (event.data as unknown as HomeData["event"]) ?? null,
        availableRewards: rewards.count ?? 0,
        checkins: checkins.count ?? 0,
        latestBadge: badgeData?.badge_definitions ?? null,
      });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const firstName = data.displayName.split(" ")[0] || "Bafafã";
  const campaign = data.event?.campaigns?.[0];

  return (
    <AppShell>
      <header className="relative overflow-hidden px-5 pb-5 pt-5">
        <div className="absolute -right-14 -top-20 h-44 w-44 rounded-full bg-mango/70 blur-2xl" />
        <div className="absolute -left-16 top-8 h-32 w-32 rounded-full bg-samba/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <Wordmark variant="full" />
          <span className="cut-label bg-lagoa text-foreground">clube oficial</span>
        </div>
        <div className="relative mt-5">
          <p className="section-kicker text-muted-foreground">Chegue mais, Bafafã</p>
          <h1 className="poster-title mt-1">
            Ô, {firstName}!<span className="text-samba">*</span>
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-brick" /> Praça Dr. Amaro de Souza · Lagoa Nova
          </p>
        </div>
      </header>

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
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="cut-label bg-mango text-foreground">{data.event.category}</span>
                <span className="cut-label rotate-[2deg] bg-white text-foreground">
                  agenda do bafafá
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="section-kicker text-background/70">Próximo rolê</p>
                <h2 className="mt-1 font-display text-5xl leading-[0.86]">{data.event.name}</h2>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-background/90">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-mango" />
                    {formatEventDate(data.event.starts_at)} · {formatEventTime(data.event.starts_at)}
                  </p>
                  {data.event.attraction && <p>Som: {data.event.attraction}</p>}
                </div>
              </div>
            </div>

            {campaign && (
              <div className="checker-texture border-t-[3px] border-foreground p-4 text-foreground">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker">Check-in vale mimo</p>
                    <p className="mt-1 font-poster text-lg leading-tight">
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
                className="flex items-center justify-center gap-1.5 border-r-2 border-foreground px-3 py-3 text-sm font-black"
              >
                Ver agenda <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/checkin"
                className="flex items-center justify-center gap-1.5 bg-primary px-3 py-3 text-sm font-black text-primary-foreground"
              >
                Fazer check-in <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : (
          <section className="poster-card brick-texture p-6 text-white">
            <span className="cut-label bg-mango text-foreground">agenda</span>
            <h2 className="mt-5 font-display text-4xl leading-none">A fofoca do próximo rolê ainda não vazou.</h2>
            <p className="mt-3 max-w-sm text-sm font-semibold text-white/90">
              Assim que o evento for publicado, ele aparece bem aqui.
            </p>
          </section>
        )}

        <Link to="/perfil" className="sticker-card block bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 rotate-[-4deg] place-items-center rounded-full border-2 border-foreground bg-lagoa text-foreground">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="section-kicker text-muted-foreground">Sua carteirinha</p>
                <p className="font-poster text-lg">Perfil {data.completeness}% completo</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-foreground bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${data.completeness}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {data.completeness >= 100
              ? "Perfil no grau. Agora é só acumular história e selo."
              : "Conta mais uma fofoca e desbloqueie novos selos."}
          </p>
        </Link>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/mimos" className="sticker-card checker-texture p-4 text-foreground">
            <Gift className="h-6 w-6" />
            <p className="mt-3 font-display text-5xl leading-none">{data.availableRewards}</p>
            <p className="mt-1 text-xs font-black uppercase">mimos disponíveis</p>
          </Link>
          <div className="sticker-card grid-texture bg-electric p-4 text-white">
            <CheckCircle2 className="h-6 w-6" />
            <p className="mt-3 font-display text-5xl leading-none">{data.checkins}</p>
            <p className="mt-1 text-xs font-black uppercase">check-ins feitos</p>
          </div>
        </div>

        {data.latestBadge && (
          <section className="sticker-card flex items-center gap-4 bg-lagoa p-4 text-foreground">
            <BadgeSticker badge={data.latestBadge} className="shrink-0 scale-75" />
            <div className="-ml-3 min-w-0">
              <p className="section-kicker opacity-70">Selo novo na coleção</p>
              <p className="mt-1 font-poster text-xl leading-tight">{data.latestBadge.name}</p>
              <p className="mt-1 text-xs font-semibold opacity-75">{data.latestBadge.description}</p>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
