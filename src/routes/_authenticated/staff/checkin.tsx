import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Gift,
  History,
  Keyboard,
  Loader2,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/wordmark";
import { QrScanner } from "@/components/operations/qr-scanner";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/bafafa";

type EventRow = { id: string; name: string; starts_at: string; status: string };
type Result = {
  ok: boolean;
  duplicate?: boolean;
  display_name?: string;
  event_name?: string;
  rewards_granted?: number;
  campaign_name?: string;
  product_name?: string | null;
  user_id?: string;
};
type HistoryItem = Result & {
  id: string;
  mode: Mode;
  at: string;
  success: boolean;
  message?: string;
};
type Mode = "checkin" | "reward";
type InputMode = "camera" | "manual";

export const Route = createFileRoute("/_authenticated/staff/checkin")({
  component: StaffCheckin,
});

function StaffCheckin() {
  const { loading: authLoading, roles } = useAuth();
  const [mode, setMode] = useState<Mode>("checkin");
  const [inputMode, setInputMode] = useState<InputMode>("camera");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const allowed = hasRole(roles, "equipe", "admin");

  const loadEvents = useCallback(async () => {
    if (!allowed) return;
    const { data, error } = await supabase
      .from("events")
      .select("id,name,starts_at,status")
      .eq("checkin_enabled", true)
      .in("status", ["scheduled", "published", "ongoing"])
      .order("starts_at", { ascending: true });
    if (error) return toast.error(error.message);
    const rows = (data ?? []) as EventRow[];
    setEvents(rows);
    setEventId((current) =>
      rows.some((event) => event.id === current) ? current : (rows[0]?.id ?? ""),
    );
  }, [allowed]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === eventId) ?? null,
    [eventId, events],
  );

  const addHistory = useCallback((item: Omit<HistoryItem, "id" | "at">) => {
    setHistory((current) =>
      [{ ...item, id: crypto.randomUUID(), at: new Date().toISOString() }, ...current].slice(0, 8),
    );
  }, []);

  const feedback = useCallback((success: boolean) => {
    if (navigator.vibrate) navigator.vibrate(success ? 100 : [70, 50, 70]);
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = success ? 760 : 220;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.17);
      oscillator.addEventListener("ended", () => void context.close());
    } catch {
      // Som é apenas um reforço operacional; a validação continua normalmente.
    }
  }, []);

  const validateValue = useCallback(
    async (value: string) => {
      const cleanValue = value.trim();
      if (!cleanValue || submitting) return;
      if (mode === "checkin" && !eventId) {
        toast.error("Selecione o evento.");
        return;
      }

      setSubmitting(true);
      setResult(null);
      setFailure(null);
      const response =
        mode === "checkin"
          ? await supabase.rpc("validate_checkin_qr", { _token: cleanValue, _event_id: eventId })
          : await supabase.rpc("redeem_reward_qr", { _token: cleanValue });
      setSubmitting(false);

      if (response.error) {
        const message = response.error.message;
        setFailure(message);
        addHistory({ ok: false, mode, success: false, message });
        feedback(false);
        toast.error(message);
        return;
      }

      const validated = response.data as Result;
      setResult(validated);
      setCode("");
      addHistory({ ...validated, mode, success: true });
      feedback(true);
      toast.success(mode === "checkin" ? "Check-in validado." : "Mimo utilizado.");
    },
    [addHistory, eventId, feedback, mode, submitting],
  );

  if (authLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  if (!allowed) {
    return (
      <div className="mx-auto grid min-h-screen max-w-lg place-items-center bg-background px-6">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-2xl">Acesso da equipe</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta não tem permissão para validar códigos.
          </p>
          <Link
            to="/inicio"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-canvas mx-auto min-h-screen max-w-xl bg-background px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Wordmark variant="short" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-foreground bg-card shadow-[2px_3px_0_var(--foreground)]"
            aria-label="Atualizar eventos"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/inicio"
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-foreground bg-card shadow-[2px_3px_0_var(--foreground)]"
            aria-label="Sair da validação"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <p className="mt-7 section-kicker text-muted-foreground">Operação do bar</p>
      <h1 className="mt-1 font-display text-4xl leading-none">Validador</h1>
      <p className="mt-2 text-sm font-semibold text-muted-foreground">
        Escaneie o QR ou digite os seis números. Nenhum dado pessoal fica dentro do código.
      </p>

      <div className="mt-5 grid grid-cols-2 rounded-2xl border-2 border-foreground bg-card p-1.5 text-sm font-black shadow-[3px_4px_0_var(--foreground)]">
        <button
          onClick={() => {
            setMode("checkin");
            setResult(null);
            setFailure(null);
          }}
          className={`rounded-xl py-2.5 ${mode === "checkin" ? "bg-primary text-white" : "text-muted-foreground"}`}
        >
          Check-in
        </button>
        <button
          onClick={() => {
            setMode("reward");
            setResult(null);
            setFailure(null);
          }}
          className={`rounded-xl py-2.5 ${mode === "reward" ? "bg-samba text-white" : "text-muted-foreground"}`}
        >
          Mimo
        </button>
      </div>

      {mode === "checkin" && (
        <section className="sticker-card mt-5 p-4">
          <label className="block">
            <span className="section-kicker text-muted-foreground">Evento da operação</span>
            <select
              value={eventId}
              onChange={(event) => {
                setEventId(event.target.value);
                setResult(null);
                setFailure(null);
              }}
              className="mt-2 w-full rounded-xl border-2 border-foreground bg-surface px-4 py-3 font-black outline-none"
            >
              {events.length === 0 && <option value="">Nenhum evento aberto</option>}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          {selectedEvent && (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {formatDateTime(selectedEvent.starts_at)}
            </p>
          )}
        </section>
      )}

      <div className="mt-5 grid grid-cols-2 rounded-2xl bg-muted p-1 text-sm font-black">
        <button
          type="button"
          onClick={() => setInputMode("camera")}
          className={`inline-flex items-center justify-center gap-2 rounded-xl py-2.5 ${
            inputMode === "camera"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Camera className="h-4 w-4" /> Câmera
        </button>
        <button
          type="button"
          onClick={() => setInputMode("manual")}
          className={`inline-flex items-center justify-center gap-2 rounded-xl py-2.5 ${
            inputMode === "manual"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Keyboard className="h-4 w-4" /> Digitar
        </button>
      </div>

      <section className="mt-4">
        {inputMode === "camera" ? (
          <QrScanner
            active={!submitting && !result}
            busy={submitting}
            onScan={validateValue}
            onError={(message) => setFailure(message)}
          />
        ) : (
          <div className="card-festa space-y-4 p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black">Código de 6 dígitos</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && code.length === 6) void validateValue(code);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000 000"
                className="w-full rounded-2xl border-[3px] border-foreground bg-surface px-4 py-4 text-center font-mono text-3xl font-black tracking-[0.2em] outline-none focus:ring-4 focus:ring-primary/15"
              />
            </label>
            <button
              type="button"
              onClick={() => void validateValue(code)}
              disabled={submitting || code.length !== 6 || (mode === "checkin" && !eventId)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "checkin" ? (
                <QrCode className="h-4 w-4" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {mode === "checkin" ? "Confirmar check-in" : "Confirmar uso do mimo"}
            </button>
          </div>
        )}
      </section>

      {submitting && (
        <section className="poster-card mt-5 grid place-items-center bg-electric p-7 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 font-black">Conferindo a fofoca…</p>
        </section>
      )}

      {failure && !submitting && (
        <section className="poster-card mt-5 border-destructive bg-destructive/10 p-5 text-foreground">
          <XCircle className="h-9 w-9 text-destructive" />
          <h2 className="mt-3 font-display text-3xl">Código não validado</h2>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{failure}</p>
          <button
            type="button"
            onClick={() => {
              setFailure(null);
              setResult(null);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-foreground bg-card px-4 py-2.5 text-sm font-black shadow-[2px_3px_0_var(--foreground)]"
          >
            <RefreshCw className="h-4 w-4" /> Tentar outro
          </button>
        </section>
      )}

      {result && !submitting && (
        <section className="poster-card mt-5 bg-samba p-5 text-white">
          <CheckCircle2 className="h-10 w-10" />
          <p className="mt-3 section-kicker text-white/75">Validação concluída</p>
          <h2 className="mt-1 font-display text-4xl">{result.display_name || "Bafafã"}</h2>
          {result.event_name && <p className="mt-2 font-black">{result.event_name}</p>}
          {result.campaign_name && <p className="mt-2 font-black">{result.campaign_name}</p>}
          {result.product_name && <p className="text-sm text-white/80">{result.product_name}</p>}
          {result.duplicate && (
            <p className="mt-4 rounded-xl bg-mango p-3 text-sm font-black text-foreground">
              Atenção: esse cliente já tinha feito check-in neste evento.
            </p>
          )}
          {typeof result.rewards_granted === "number" && result.rewards_granted > 0 && (
            <p className="mt-4 rounded-xl bg-white/15 p-3 text-sm font-black">
              {result.rewards_granted} mimo(s) liberado(s).
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setFailure(null);
            }}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-mango px-4 py-3 text-sm font-black text-foreground shadow-[3px_4px_0_var(--foreground)]"
          >
            <ShieldCheck className="h-4 w-4" /> Validar próximo
          </button>
        </section>
      )}

      {history.length > 0 && (
        <section className="card-festa mt-6 p-5">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Últimas validações</h2>
          </div>
          <div className="mt-4 divide-y divide-border">
            {history.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3 text-sm">
                {item.success ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">
                    {item.success ? item.display_name || "Validado" : item.message || "Falhou"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.mode === "checkin"
                      ? item.event_name || "Check-in"
                      : item.campaign_name || "Mimo"}
                    {" · "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.at))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
