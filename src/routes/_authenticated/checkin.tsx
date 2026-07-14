import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Gift,
  KeyRound,
  MapPin,
  MessageCircleMore,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { SecureQr } from "@/components/operations/secure-qr";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate, formatEventTime } from "@/lib/bafafa";
import { useAuth } from "@/hooks/use-auth";

type EventRow = {
  id: string;
  name: string;
  starts_at: string;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  status: string;
  chat_enabled: boolean;
};

type TokenResult = {
  token: string;
  short_code: string;
  expires_at: string;
};

type WindowPhase = "before" | "open" | "closed";

type WindowState = {
  phase: WindowPhase;
  opensAt: number;
  closesAt: number;
  distanceMs: number;
};

export const Route = createFileRoute("/_authenticated/checkin")({
  component: Checkin,
});

function Checkin() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [token, setToken] = useState<TokenResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadEvents = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("events")
      .select("id,name,starts_at,checkin_opens_at,checkin_closes_at,status,chat_enabled")
      .eq("checkin_enabled", true)
      .in("status", ["scheduled", "published", "ongoing"])
      .order("starts_at", { ascending: true });

    if (queryError) {
      setError(queryError.message);
    } else {
      const rows = (data ?? []) as EventRow[];
      setEvents(rows);
      setSelectedId((current) => {
        if (current && rows.some((event) => event.id === current)) return current;
        const active = rows.find((event) => getWindowState(event, Date.now()).phase === "open");
        return active?.id ?? rows[0]?.id ?? "";
      });
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const checkConfirmation = useCallback(async () => {
    if (!user || !selectedId) {
      setConfirmed(false);
      return false;
    }
    const { data, error: confirmationError } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", selectedId)
      .maybeSingle();
    if (confirmationError) return false;
    const isConfirmed = Boolean(data);
    setConfirmed(isConfirmed);
    return isConfirmed;
  }, [selectedId, user]);

  useEffect(() => {
    void checkConfirmation();
    const timer = window.setInterval(() => void checkConfirmation(), 5000);
    return () => window.clearInterval(timer);
  }, [checkConfirmation]);

  const selected = events.find((event) => event.id === selectedId) ?? null;
  const windowState = selected ? getWindowState(selected, now) : null;
  const secondsLeft = token
    ? Math.max(0, Math.ceil((new Date(token.expires_at).getTime() - now) / 1000))
    : 0;

  useEffect(() => {
    if (token && secondsLeft === 0) setToken(null);
  }, [secondsLeft, token]);

  async function refreshStatus() {
    await Promise.all([loadEvents(true), checkConfirmation()]);
    setNow(Date.now());
    toast.success("Status atualizado.");
  }

  async function generateCode() {
    if (!selected || windowState?.phase !== "open") return;
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
      <ScreenHeader
        eyebrow="Sua presença vale mimo"
        title="Check-in"
        tone="blue"
        action={
          <button
            type="button"
            onClick={() => void refreshStatus()}
            disabled={refreshing}
            aria-label="Atualizar status"
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-foreground bg-background text-foreground shadow-[2px_3px_0_var(--foreground)] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        }
      />
      {loading && <LoadingCard label="Procurando o evento de hoje…" />}
      {error && !loading && (
        <div className="space-y-3">
          <ErrorCard message={error} />
          <div className="px-5">
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
            >
              <RefreshCw className="h-4 w-4" /> Tentar de novo
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-5 px-5 pt-2">
          {events.length === 0 ? (
            <section className="poster-card checker-texture p-6 text-foreground">
              <span className="cut-label bg-white">check-in</span>
              <CalendarCheck className="mt-5 h-8 w-8" />
              <h2 className="mt-3 font-display text-4xl leading-none">
                Ainda não abriu a catraca da fofoca.
              </h2>
              <p className="mt-3 text-sm font-semibold opacity-75">
                Assim que um evento for liberado pela equipe, seu código aparece aqui.
              </p>
            </section>
          ) : (
            <>
              <section className="sticker-card overflow-hidden bg-card p-5">
                <label className="section-kicker text-muted-foreground">
                  Em qual rolê você está?
                </label>
                <select
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setToken(null);
                    setConfirmed(false);
                  }}
                  className="mt-3 w-full rounded-xl border-2 border-foreground bg-surface px-4 py-3 font-black outline-none focus:ring-4 focus:ring-lagoa/25"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                {selected && windowState && (
                  <div className="mt-4 space-y-2 text-sm font-semibold text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 break-words">
                        {formatEventDate(selected.starts_at)} ·{" "}
                        {formatEventTime(selected.starts_at)}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-brick" />
                      <span>Praça Dr. Amaro de Souza</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <WindowStatusPill phase={confirmed ? "confirmed" : windowState.phase} />
                      <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-black text-foreground">
                        {formatWindow(windowState)}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {confirmed ? (
                <section className="poster-card grid-texture bg-samba p-6 text-white">
                  <span className="cut-label bg-mango text-foreground">presença confirmada</span>
                  <ShieldCheck className="mt-6 h-10 w-10" />
                  <h2 className="mt-3 font-display text-4xl leading-none">
                    Você está oficialmente no Bafafá.
                  </h2>
                  <p className="mt-3 text-sm font-semibold text-white/85">
                    Seu check-in foi validado. Selos e mimos elegíveis já foram processados.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Link
                      to="/mimos"
                      className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-mango px-4 py-3 text-center text-sm font-black text-foreground shadow-[4px_5px_0_var(--foreground)]"
                    >
                      Ver meus mimos <Gift className="h-4 w-4 shrink-0" />
                    </Link>
                    {selected?.chat_enabled && (
                      <Link
                        to="/resenha"
                        search={{ event: selected.id }}
                        className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-white/80 bg-foreground px-4 py-3 text-center text-sm font-black text-background shadow-[4px_5px_0_var(--mango)]"
                      >
                        Entrar na Resenha <MessageCircleMore className="h-4 w-4 shrink-0" />
                      </Link>
                    )}
                  </div>
                </section>
              ) : windowState?.phase === "before" ? (
                <section className="ticket-card checker-texture p-5 text-foreground">
                  <span className="cut-label bg-white">calma, emocionado</span>
                  <p className="mt-4 font-display text-3xl leading-none">
                    Ainda não abriu, Bafafã.
                  </p>
                  <p className="mt-2 text-sm font-semibold opacity-75">
                    O código será liberado automaticamente quando a janela começar.
                  </p>
                  <div className="mt-4 rounded-2xl border-2 border-foreground/15 bg-white/75 p-3">
                    <p className="flex items-center gap-2 text-sm font-black">
                      <TimerReset className="h-4 w-4" /> Abre em{" "}
                      {formatCountdown(windowState.distanceMs)}
                    </p>
                    <p className="mt-1 text-xs font-semibold opacity-70">
                      {formatWindow(windowState)}
                    </p>
                  </div>
                </section>
              ) : windowState?.phase === "closed" ? (
                <section className="ticket-card brick-texture p-5 text-white">
                  <span className="cut-label bg-mango text-foreground">janela encerrada</span>
                  <p className="mt-4 font-display text-3xl leading-none">
                    O check-in deste rolê fechou.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/85">
                    Caso você tenha chegado dentro do horário, fale com a equipe do Bafafá.
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-sm font-black">
                    <Clock3 className="h-4 w-4" /> {formatWindow(windowState)}
                  </p>
                </section>
              ) : token ? (
                <section className="poster-card overflow-hidden bg-foreground text-center text-background">
                  <div className="brick-texture border-b-[3px] border-foreground px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
                    Mostre este código à equipe
                  </div>
                  <div className="bg-confete p-6">
                    <KeyRound className="mx-auto h-8 w-8 text-mango" />
                    <p className="mt-3 text-sm font-semibold text-background/75">
                      A equipe pode escanear o QR ou digitar o código abaixo.
                    </p>
                    <div className="mt-5">
                      <SecureQr
                        value={token.token}
                        shortCode={token.short_code}
                        secondsLeft={secondsLeft}
                        dark
                      />
                    </div>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={generateCode}
                        disabled={generating}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-background bg-background px-5 py-2.5 text-sm font-black text-foreground shadow-[3px_4px_0_var(--mango)] disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />{" "}
                        Gerar outro
                      </button>
                      <button
                        type="button"
                        onClick={() => void refreshStatus()}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-background/70 px-5 py-2.5 text-sm font-black text-background disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Já validaram?
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="poster-card grid-texture bg-primary p-6 text-primary-foreground">
                  <span className="cut-label bg-mango text-foreground">check-in liberado</span>
                  <ShieldCheck className="mt-6 h-9 w-9" />
                  <h2 className="mt-3 font-display text-4xl leading-none">
                    Sua presença vale mimo.
                  </h2>
                  <p className="mt-3 text-sm font-semibold opacity-90">
                    Gere o código, mostre para a equipe e deixe o sistema fazer o resto da fofoca.
                  </p>
                  {windowState && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-black">
                      <Clock3 className="h-4 w-4" /> Encerra em{" "}
                      {formatCountdown(windowState.distanceMs)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={generateCode}
                    disabled={generating}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-mango px-5 py-3 text-sm font-black text-foreground shadow-[4px_5px_0_var(--foreground)] disabled:opacity-60"
                  >
                    {generating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Gerar meu código
                  </button>
                </section>
              )}

              <p className="px-3 text-center text-[11px] font-semibold text-muted-foreground">
                A equipe valida o código numérico. Ele não carrega telefone, aniversário nem outros
                dados pessoais.
              </p>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function getWindowState(event: EventRow, timestamp: number): WindowState {
  const opensAt = event.checkin_opens_at
    ? new Date(event.checkin_opens_at).getTime()
    : new Date(event.starts_at).getTime() - 2 * 60 * 60 * 1000;
  const closesAt = event.checkin_closes_at
    ? new Date(event.checkin_closes_at).getTime()
    : new Date(event.starts_at).getTime() + 6 * 60 * 60 * 1000;

  if (timestamp < opensAt)
    return { phase: "before", opensAt, closesAt, distanceMs: opensAt - timestamp };
  if (timestamp > closesAt)
    return { phase: "closed", opensAt, closesAt, distanceMs: timestamp - closesAt };
  return { phase: "open", opensAt, closesAt, distanceMs: closesAt - timestamp };
}

function formatWindow(state: WindowState) {
  return `Das ${formatClock(state.opensAt)} às ${formatClock(state.closesAt)}`;
}

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(timestamp),
  );
}

function formatCountdown(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

function WindowStatusPill({ phase }: { phase: WindowPhase | "confirmed" }) {
  const style =
    phase === "confirmed"
      ? "bg-samba text-white"
      : phase === "open"
        ? "bg-primary text-white"
        : phase === "before"
          ? "bg-mango text-foreground"
          : "bg-brick text-white";
  const label =
    phase === "confirmed"
      ? "Presença confirmada"
      : phase === "open"
        ? "Check-in liberado"
        : phase === "before"
          ? "Ainda não abriu"
          : "Check-in encerrado";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${style}`}>{label}</span>;
}
