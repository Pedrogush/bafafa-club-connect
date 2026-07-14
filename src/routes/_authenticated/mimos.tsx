import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Gift, KeyRound, PartyPopper, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { supabase } from "@/integrations/supabase/client";
import { campaignBenefitLabel, formatDateTime, rewardStatusLabel } from "@/lib/bafafa";

type RewardRow = {
  id: string;
  status: string;
  expires_at: string | null;
  granted_at: string;
  campaigns: {
    name: string;
    description: string | null;
    benefit_type: string;
    discount_percent: number | null;
    fixed_off_cents: number | null;
    product_name: string | null;
    public_rules: string | null;
  } | null;
  events: { name: string } | null;
};

type RedemptionToken = { token: string; short_code: string; expires_at: string };
type Tab = "available" | "redeemed" | "expired";

export const Route = createFileRoute("/_authenticated/mimos")({
  component: Mimos,
});

function Mimos() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [tab, setTab] = useState<Tab>("available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReward, setActiveReward] = useState<string | null>(null);
  const [token, setToken] = useState<RedemptionToken | null>(null);
  const [generating, setGenerating] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("user_rewards")
      .select(
        "id,status,expires_at,granted_at,campaigns(name,description,benefit_type,discount_percent,fixed_off_cents,product_name,public_rules),events(name)",
      )
      .order("granted_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!mounted) return;
        if (queryError) setError(queryError.message);
        else setRewards((data ?? []) as unknown as RewardRow[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const byTab = useMemo(
    () => rewards.filter((reward) => normalizedStatus(reward) === tab),
    [rewards, tab, now],
  );
  const secondsLeft = token
    ? Math.max(0, Math.ceil((new Date(token.expires_at).getTime() - now) / 1000))
    : 0;

  useEffect(() => {
    if (token && secondsLeft === 0) {
      setToken(null);
      setActiveReward(null);
    }
  }, [secondsLeft, token]);

  async function generateRewardCode(rewardId: string) {
    setGenerating(true);
    const { data, error: rpcError } = await supabase.rpc("create_my_qr_token", {
      _purpose: "redemption",
      _ref_id: rewardId,
    });
    setGenerating(false);
    if (rpcError) return toast.error(rpcError.message);
    const result = Array.isArray(data) ? data[0] : null;
    if (!result) return toast.error("Não foi possível gerar o código do mimo.");
    setActiveReward(rewardId);
    setToken(result as RedemptionToken);
  }

  return (
    <AppShell>
      <ScreenHeader eyebrow="Benefícios liberados" title="Mimos" />
      {loading && <LoadingCard label="Abrindo sua carteira de mimos…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-4 px-5">
          <div className="grid grid-cols-3 rounded-full bg-muted p-1 text-xs font-bold">
            {(
              [
                ["available", "Disponíveis"],
                ["redeemed", "Utilizados"],
                ["expired", "Expirados"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setTab(value);
                  setToken(null);
                  setActiveReward(null);
                }}
                className={`rounded-full px-2 py-2.5 transition ${tab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {byTab.length === 0 ? (
            <section className="card-festa bg-lagoa p-6 text-lagoa-foreground">
              <Gift className="h-8 w-8" />
              <h2 className="mt-3 font-display text-2xl">Nada por aqui ainda.</h2>
              <p className="mt-2 text-sm opacity-90">
                Faça check-in nos eventos participantes para desbloquear seus primeiros mimos.
              </p>
            </section>
          ) : (
            byTab.map((reward) => {
              const campaign = reward.campaigns;
              const isActive = activeReward === reward.id && token;
              return (
                <article key={reward.id} className="card-festa overflow-hidden">
                  <div
                    className={`h-2 ${tab === "available" ? "bg-primary" : tab === "redeemed" ? "bg-lagoa" : "bg-muted-foreground"}`}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                          {rewardStatusLabel(reward.status, reward.expires_at)}
                        </p>
                        <h2 className="mt-1 font-display text-xl">
                          {campaign?.name ?? "Mimo do Bafafá"}
                        </h2>
                      </div>
                      <PartyPopper className="h-6 w-6 shrink-0 text-samba" />
                    </div>
                    {campaign && (
                      <p className="mt-3 text-base font-bold text-primary">
                        {campaignBenefitLabel(campaign)}
                      </p>
                    )}
                    {campaign?.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{campaign.description}</p>
                    )}
                    {reward.events?.name && (
                      <p className="mt-3 text-sm font-semibold">Evento: {reward.events.name}</p>
                    )}
                    {reward.expires_at && (
                      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" /> Válido até{" "}
                        {formatDateTime(reward.expires_at)}
                      </p>
                    )}
                    {campaign?.public_rules && (
                      <p className="mt-3 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                        {campaign.public_rules}
                      </p>
                    )}

                    {tab === "available" && !isActive && (
                      <button
                        type="button"
                        onClick={() => generateRewardCode(reward.id)}
                        disabled={generating}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                      >
                        {generating && <RefreshCw className="h-4 w-4 animate-spin" />} Usar meu mimo
                      </button>
                    )}

                    {isActive && token && (
                      <div className="mt-5 rounded-2xl bg-foreground p-5 text-center text-background">
                        <KeyRound className="mx-auto h-6 w-6 text-mango" />
                        <p className="mt-3 font-mono text-3xl font-black tracking-[0.18em] text-mango">
                          {token.short_code.match(/.{1,3}/g)?.join(" ")}
                        </p>
                        <p className="mt-2 text-xs text-background/70">
                          Mostre à equipe. Expira em {secondsLeft}s.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </AppShell>
  );
}

function normalizedStatus(reward: RewardRow): Tab {
  if (reward.status === "redeemed") return "redeemed";
  if (reward.status === "expired" || reward.status === "revoked") return "expired";
  if (reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now()) return "expired";
  return "available";
}
