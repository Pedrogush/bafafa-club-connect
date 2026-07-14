import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Gift, KeyRound, PartyPopper, RefreshCw, Sparkles, Ticket } from "lucide-react";
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
      <ScreenHeader eyebrow="Benefícios liberados" title="Mimos" tone="green" />
      {loading && <LoadingCard label="Abrindo sua carteira de mimos…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-5 px-5 pt-2">
          <div className="grid grid-cols-3 rounded-2xl border-2 border-foreground bg-card p-1.5 text-[11px] font-black shadow-[3px_4px_0_var(--foreground)]">
            {(
              [
                ["available", "Disponíveis"],
                ["redeemed", "Usados"],
                ["expired", "Expirados"],
              ] as const
            ).map(([value, label], index) => (
              <button
                key={value}
                onClick={() => {
                  setTab(value);
                  setToken(null);
                  setActiveReward(null);
                }}
                className={`rounded-xl px-2 py-2.5 transition ${
                  tab === value
                    ? ["bg-mango", "bg-lagoa", "bg-muted"][index] + " text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {byTab.length === 0 ? (
            <section className="poster-card grid-texture bg-electric p-6 text-white">
              <span className="cut-label bg-mango text-foreground">carteira vazia</span>
              <Gift className="mt-5 h-8 w-8" />
              <h2 className="mt-3 font-display text-4xl leading-none">Nada por aqui. Ainda.</h2>
              <p className="mt-3 text-sm font-semibold text-white/85">
                Faça check-in nos eventos participantes e deixe os mimos aparecerem sozinhos.
              </p>
            </section>
          ) : (
            byTab.map((reward, index) => {
              const campaign = reward.campaigns;
              const isActive = activeReward === reward.id && token;
              const available = tab === "available";
              return (
                <article
                  key={reward.id}
                  className={`ticket-card ${available ? (index % 2 === 0 ? "checker-texture" : "grid-texture bg-lagoa") : "bg-card"} p-5 text-foreground`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`cut-label ${
                          available
                            ? "bg-white"
                            : tab === "redeemed"
                              ? "bg-lagoa"
                              : "bg-muted"
                        }`}
                      >
                        {rewardStatusLabel(reward.status, reward.expires_at)}
                      </span>
                      <h2 className="mt-4 font-display text-3xl leading-none">
                        {campaign?.name ?? "Mimo do Bafafá"}
                      </h2>
                    </div>
                    <Ticket className="h-8 w-8 shrink-0" strokeWidth={2.3} />
                  </div>

                  {campaign && (
                    <p className="mt-4 font-poster text-xl leading-tight">
                      {campaignBenefitLabel(campaign)}
                    </p>
                  )}
                  {campaign?.description && (
                    <p className="mt-2 text-sm font-semibold text-foreground/70">{campaign.description}</p>
                  )}
                  {reward.events?.name && (
                    <p className="mt-4 text-sm font-black">Rolê: {reward.events.name}</p>
                  )}
                  {reward.expires_at && (
                    <p className="mt-2 flex items-center gap-2 text-xs font-bold text-foreground/65">
                      <Clock3 className="h-3.5 w-3.5" /> Válido até {formatDateTime(reward.expires_at)}
                    </p>
                  )}
                  {campaign?.public_rules && (
                    <p className="mt-4 rounded-xl border-2 border-foreground/20 bg-white/65 p-3 text-xs font-semibold text-foreground/70">
                      {campaign.public_rules}
                    </p>
                  )}

                  {available && !isActive && (
                    <button
                      type="button"
                      onClick={() => generateRewardCode(reward.id)}
                      disabled={generating}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)] disabled:opacity-60"
                    >
                      {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PartyPopper className="h-4 w-4" />}
                      Usar meu mimo
                    </button>
                  )}

                  {isActive && token && (
                    <div className="poster-card mt-5 bg-foreground p-5 text-center text-background shadow-none">
                      <KeyRound className="mx-auto h-7 w-7 text-mango" />
                      <p className="mt-3 font-mono text-4xl font-black tracking-[0.16em] text-mango">
                        {token.short_code.match(/.{1,3}/g)?.join(" ")}
                      </p>
                      <p className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-background/70">
                        <Sparkles className="h-3.5 w-3.5" /> Mostre à equipe · expira em {secondsLeft}s
                      </p>
                    </div>
                  )}
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
