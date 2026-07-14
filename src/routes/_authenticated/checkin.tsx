import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock3, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate, formatEventTime } from "@/lib/bafafa";

type EventRow = {
  id: string;
  name: string;
  starts_at: string;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  status: string;
};

type TokenResult = {
  token: string;
  short_code: string;
  expires_at: string;
};

export const Route = createFileRoute("/_authenticated/checkin")({
  component: Checkin,
});

function Checkin() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [token, setToken] = useState<TokenResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("events")
      .select("id,name,starts_at,checkin_opens_at,checkin_closes_at,status")
      .eq("checkin_enabled", true)
      .in("status", ["scheduled", "ongoing"])
      .order("starts_at", { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!mounted) return;
        if (queryError) setError(queryError.message);
        else {
          const rows = (data ?? []) as EventRow[];
          setEvents(rows);
          const active = rows.find((event) => isWindowOpen(event, Date.now()));
          setSelectedId(active?.id ?? rows[0]?.id ?? "");
        }
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selected = events.find((event) => event.id === selectedId) ?? null;
  const windowOpen = selected ? isWindowOpen(selected, now) : false;
  const secondsLeft = token
    ? Math.max(0, Math.ceil((new Date(token.expires_at).getTime() - now) / 1000))
    : 0;
  const codeGroups = useMemo(() => token?.short_code.match(/.{1,3}/g)?.join(" ") ?? "", [token]);

  useEffect(() => {
    if (token && secondsLeft === 0) setToken(null);
  }, [secondsLeft, token]);

  async function generateCode() {
    if (!selected || !windowOpen) return;
    setGenerating(true);
    const { data, error: rpcError } = await supabase.rpc("create_my_qr_token", {
      _purpose: "checkin",
      _ref_id: selected.id,
    });
    setGenerating(false);
    if (rpcError) {
      toast.error(rpcError.message);
      return;
    }
    const result = Array.isArray(data) ? data[0] : null;
    if (!result) {
      toast.error("Não foi possível gerar o código.");
      return;
    }
    setToken(result as TokenResult);
    toast.success("Código temporário gerado.");
  }

  return (
    <AppShell>
      <ScreenHeader eyebrow="Sua presença vale mimo" title="Check-in" />
      {loading && <LoadingCard label="Procurando o evento de hoje…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-4 px-5">
          {events.length === 0 ? (
            <section className="card-festa bg-primary p-6 text-primary-foreground">
              <CalendarCheck className="h-8 w-8" />
              <h2 className="mt-3 font-display text-2xl">Ainda não tem check-in aberto.</h2>
              <p className="mt-2 text-sm opacity-90">
                Assim que um evento for liberado pela equipe, seu código aparece aqui.
              </p>
            </section>
          ) : (
            <>
              <section className="card-festa p-5">
                <label className="block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Evento
                </label>
                <select
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setToken(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-input bg-surface px-4 py-3 font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                {selected && (
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4" /> {formatEventDate(selected.starts_at)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" /> A partir das{" "}
                      {formatEventTime(selected.starts_at)}
                    </p>
                  </div>
                )}
              </section>

              {!windowOpen ? (
                <section className="card-festa border border-mango bg-mango/35 p-5">
                  <p className="font-display text-xl">Ainda não abriu, Bafafã.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O botão será liberado dentro da janela definida pela equipe para este evento.
                  </p>
                  {selected?.checkin_opens_at && (
                    <p className="mt-3 text-sm font-bold">
                      Abre às {formatEventTime(selected.checkin_opens_at)}.
                    </p>
                  )}
                </section>
              ) : token ? (
                <section className="card-festa overflow-hidden bg-foreground text-center text-background">
                  <div className="bg-samba px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-samba-foreground">
                    Mostre este código à equipe
                  </div>
                  <div className="p-6">
                    <KeyRound className="mx-auto h-8 w-8 text-mango" />
                    <p className="mt-4 font-mono text-4xl font-black tracking-[0.18em] text-mango">
                      {codeGroups}
                    </p>
                    <p className="mt-4 text-sm text-background/75">
                      O código expira em <strong className="text-background">{secondsLeft}s</strong>{" "}
                      e só pode ser usado uma vez.
                    </p>
                    <button
                      type="button"
                      onClick={generateCode}
                      disabled={generating}
                      className="mt-5 inline-flex items-center gap-2 rounded-full border border-background/25 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} /> Gerar
                      outro código
                    </button>
                  </div>
                </section>
              ) : (
                <section className="card-festa bg-primary p-6 text-primary-foreground">
                  <ShieldCheck className="h-8 w-8" />
                  <h2 className="mt-3 font-display text-2xl">Chegou no Bafafá?</h2>
                  <p className="mt-2 text-sm opacity-90">
                    Gere um código temporário e mostre para a equipe. Depois da validação, seu
                    check-in e os mimos do evento entram na conta.
                  </p>
                  <button
                    type="button"
                    onClick={generateCode}
                    disabled={generating}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-mango px-5 py-3 text-sm font-bold text-mango-foreground disabled:opacity-60"
                  >
                    {generating && <RefreshCw className="h-4 w-4 animate-spin" />} Gerar meu código
                  </button>
                </section>
              )}

              <p className="px-2 text-center text-xs text-muted-foreground">
                Nesta primeira versão, a equipe valida o código numérico. O leitor visual de QR
                entra na próxima evolução sem mudar a regra de segurança.
              </p>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function isWindowOpen(event: EventRow, timestamp: number) {
  const opens = event.checkin_opens_at
    ? new Date(event.checkin_opens_at).getTime()
    : new Date(event.starts_at).getTime() - 2 * 60 * 60 * 1000;
  const closes = event.checkin_closes_at
    ? new Date(event.checkin_closes_at).getTime()
    : new Date(event.starts_at).getTime() + 6 * 60 * 60 * 1000;
  return timestamp >= opens && timestamp <= closes;
}
