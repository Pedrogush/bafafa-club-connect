import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Clock3,
  KeyRound,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
      <ScreenHeader eyebrow="Sua presença vale mimo" title="Check-in" tone="blue" />
      {loading && <LoadingCard label="Procurando o evento de hoje…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-5 px-5 pt-2">
          {events.length === 0 ? (
            <section className="poster-card checker-texture p-6 text-foreground">
              <span className="cut-label bg-white">check-in</span>
              <CalendarCheck className="mt-5 h-8 w-8" />
              <h2 className="mt-3 font-display text-4xl leading-none">Ainda não abriu a catraca da fofoca.</h2>
              <p className="mt-3 text-sm font-semibold opacity-75">
                Assim que um evento for liberado pela equipe, seu código aparece aqui.
              </p>
            </section>
          ) : (
            <>
              <section className="sticker-card bg-card p-5">
                <label className="section-kicker text-muted-foreground">Em qual rolê você está?</label>
                <select
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setToken(null);
                  }}
                  className="mt-3 w-full rounded-xl border-2 border-foreground bg-surface px-4 py-3 font-black outline-none focus:ring-4 focus:ring-lagoa/25"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                {selected && (
                  <div className="mt-4 grid gap-2 text-sm font-semibold text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-primary" /> {formatEventDate(selected.starts_at)} · {formatEventTime(selected.starts_at)}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brick" /> Praça Dr. Amaro de Souza
                    </p>
                  </div>
                )}
              </section>

              {!windowOpen ? (
                <section className="ticket-card checker-texture p-5 text-foreground">
                  <span className="cut-label bg-white">calma, emocionado</span>
                  <p className="mt-4 font-display text-3xl leading-none">Ainda não abriu, Bafafã.</p>
                  <p className="mt-2 text-sm font-semibold opacity-75">
                    O botão será liberado dentro da janela definida pela equipe para este evento.
                  </p>
                  {selected?.checkin_opens_at && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-black">
                      <Clock3 className="h-4 w-4" /> Abre às {formatEventTime(selected.checkin_opens_at)}.
                    </p>
                  )}
                </section>
              ) : token ? (
                <section className="poster-card overflow-hidden bg-foreground text-center text-background">
                  <div className="brick-texture border-b-[3px] border-foreground px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
                    Mostre este código à equipe
                  </div>
                  <div className="bg-confete p-6">
                    <KeyRound className="mx-auto h-9 w-9 text-mango" />
                    <p className="mt-5 font-mono text-5xl font-black tracking-[0.15em] text-mango">
                      {codeGroups}
                    </p>
                    <p className="mt-4 text-sm font-semibold text-background/75">
                      Expira em <strong className="text-background">{secondsLeft}s</strong> e só vale uma vez.
                    </p>
                    <button
                      type="button"
                      onClick={generateCode}
                      disabled={generating}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-background bg-background px-5 py-2.5 text-sm font-black text-foreground shadow-[3px_4px_0_var(--mango)] disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} /> Gerar outro
                    </button>
                  </div>
                </section>
              ) : (
                <section className="poster-card grid-texture bg-primary p-6 text-primary-foreground">
                  <span className="cut-label bg-mango text-foreground">chegou no bafas?</span>
                  <ShieldCheck className="mt-6 h-9 w-9" />
                  <h2 className="mt-3 font-display text-4xl leading-none">Sua presença vale mimo.</h2>
                  <p className="mt-3 text-sm font-semibold opacity-90">
                    Gere o código, mostre para a equipe e deixe o sistema fazer o resto da fofoca.
                  </p>
                  <button
                    type="button"
                    onClick={generateCode}
                    disabled={generating}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-mango px-5 py-3 text-sm font-black text-foreground shadow-[4px_5px_0_var(--foreground)] disabled:opacity-60"
                  >
                    {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Gerar meu código
                  </button>
                </section>
              )}

              <p className="px-3 text-center text-[11px] font-semibold text-muted-foreground">
                A equipe valida o código numérico. Ele não carrega telefone, aniversário nem outros dados pessoais.
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
