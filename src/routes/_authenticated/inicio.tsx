import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Gift,
  UserRound,
} from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
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
  latestBadge: string | null;
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
          .select("awarded_at,badge_definitions(name)")
          .eq("is_hidden", false)
          .order("awarded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      const badgeData = badges.data as unknown as {
        badge_definitions: { name: string } | null;
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
        latestBadge: badgeData?.badge_definitions?.name ?? null,
      });
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const firstName = data.displayName.split(" ")[0] || "Bafafã";
  const campaign = data.event?.campaigns?.[0];

  return (
    <AppShell>
      <ScreenHeader
        eyebrow="Clube dos Bafafãs"
        title={
          <>
            Ô, {firstName}!<span className="text-samba">.</span>
          </>
        }
      />

      <div className="space-y-4 px-5">
        {data.event ? (
          <section className="card-festa relative overflow-hidden bg-foreground p-5 text-background">
            {data.event.image_url && (
              <>
                <img
                  src={data.event.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/45" />
              </>
            )}
            <div className="absolute inset-0 bg-confete opacity-20" aria-hidden />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-background/65">
                Próximo Bafafá
              </p>
              <h2 className="mt-2 font-display text-2xl leading-tight">{data.event.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-background/80">
                <CalendarDays className="h-4 w-4" /> {formatEventDate(data.event.starts_at)} ·{" "}
                {formatEventTime(data.event.starts_at)}
              </p>
              {data.event.attraction && (
                <p className="mt-1 text-sm text-background/80">Com {data.event.attraction}</p>
              )}
              {campaign && (
                <div className="mt-4 rounded-2xl bg-mango p-3 text-mango-foreground">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                    Mimo disponível
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{campaignBenefitLabel(campaign)}</p>
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  to="/eventos"
                  className="rounded-full border border-background/25 px-4 py-2.5 text-center text-sm font-bold"
                >
                  Ver evento
                </Link>
                <Link
                  to="/checkin"
                  className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground"
                >
                  Check-in
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="card-festa bg-primary p-5 text-primary-foreground">
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-75">
              Próximo Bafafá
            </p>
            <h2 className="mt-2 font-display text-2xl">A agenda está sendo preparada.</h2>
            <p className="mt-2 text-sm opacity-90">
              Quando um evento for publicado, ele aparece aqui.
            </p>
          </section>
        )}

        <Link to="/perfil" className="card-festa block p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-mango text-mango-foreground">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Seu perfil
                </p>
                <p className="font-display text-lg">{data.completeness}% completo</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${data.completeness}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.completeness >= 100
              ? "Perfil no grau. Agora é só acumular histórias."
              : "Conte mais uma fofoca e desbloqueie novos selos."}
          </p>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/mimos" className="card-festa p-4">
            <Gift className="h-6 w-6 text-samba" />
            <p className="mt-3 text-3xl font-black">{data.availableRewards}</p>
            <p className="text-xs font-semibold text-muted-foreground">mimos disponíveis</p>
          </Link>
          <div className="card-festa p-4">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <p className="mt-3 text-3xl font-black">{data.checkins}</p>
            <p className="text-xs font-semibold text-muted-foreground">check-ins feitos</p>
          </div>
        </div>

        {data.latestBadge && (
          <section className="card-festa flex items-center gap-4 bg-lagoa p-4 text-lagoa-foreground">
            <BadgeCheck className="h-8 w-8 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-75">
                Selo recente
              </p>
              <p className="font-display text-lg">{data.latestBadge}</p>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
