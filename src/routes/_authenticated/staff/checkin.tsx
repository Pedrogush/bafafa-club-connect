import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Gift, Loader2, LogOut, QrCode, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/wordmark";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type EventRow = { id: string; name: string; starts_at: string; status: string };
type Result = {
  ok: boolean;
  duplicate?: boolean;
  display_name?: string;
  event_name?: string;
  rewards_granted?: number;
  campaign_name?: string;
  product_name?: string | null;
};

type Mode = "checkin" | "reward";

export const Route = createFileRoute("/_authenticated/staff/checkin")({
  component: StaffCheckin,
});

function StaffCheckin() {
  const { loading: authLoading, roles } = useAuth();
  const [mode, setMode] = useState<Mode>("checkin");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const allowed = hasRole(roles, "equipe", "admin");

  useEffect(() => {
    if (!allowed) return;
    supabase
      .from("events")
      .select("id,name,starts_at,status")
      .eq("checkin_enabled", true)
      .in("status", ["scheduled", "ongoing"])
      .order("starts_at", { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as EventRow[];
        setEvents(rows);
        setEventId(rows[0]?.id ?? "");
      });
  }, [allowed]);

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

  async function validate() {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    if (mode === "checkin" && !eventId) return toast.error("Selecione o evento.");
    setSubmitting(true);
    setResult(null);

    const response =
      mode === "checkin"
        ? await supabase.rpc("validate_checkin_qr", { _token: cleanCode, _event_id: eventId })
        : await supabase.rpc("redeem_reward_qr", { _token: cleanCode });

    setSubmitting(false);
    if (response.error) {
      toast.error(response.error.message);
      return;
    }
    setResult(response.data as Result);
    setCode("");
    toast.success(mode === "checkin" ? "Check-in validado." : "Mimo utilizado.");
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background px-5 py-8">
      <header className="flex items-center justify-between">
        <Wordmark variant="short" />
        <Link
          to="/inicio"
          className="grid h-10 w-10 place-items-center rounded-full border border-input"
          aria-label="Sair da validação"
        >
          <LogOut className="h-4 w-4" />
        </Link>
      </header>

      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Operação do bar
      </p>
      <h1 className="mt-1 font-display text-3xl">Validar código</h1>

      <div className="mt-6 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-bold">
        <button
          onClick={() => {
            setMode("checkin");
            setResult(null);
          }}
          className={`rounded-full py-2.5 ${mode === "checkin" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Check-in
        </button>
        <button
          onClick={() => {
            setMode("reward");
            setResult(null);
          }}
          className={`rounded-full py-2.5 ${mode === "reward" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Mimo
        </button>
      </div>

      <section className="card-festa mt-5 space-y-4 p-5">
        {mode === "checkin" && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Evento</span>
            <select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="w-full rounded-2xl border border-input bg-surface px-4 py-3 outline-none focus:border-primary"
            >
              {events.length === 0 && <option value="">Nenhum evento aberto</option>}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Código de 6 dígitos</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000 000"
            className="w-full rounded-2xl border border-input bg-surface px-4 py-4 text-center font-mono text-2xl font-black tracking-[0.2em] outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </label>

        <button
          type="button"
          onClick={validate}
          disabled={submitting || code.length !== 6 || (mode === "checkin" && !eventId)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
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
      </section>

      {result && (
        <section className="card-festa mt-5 border border-primary/20 bg-primary/10 p-5">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Tudo certo!</h2>
          <p className="mt-2 font-bold">{result.display_name}</p>
          {result.event_name && (
            <p className="text-sm text-muted-foreground">Evento: {result.event_name}</p>
          )}
          {result.campaign_name && (
            <p className="text-sm text-muted-foreground">Mimo: {result.campaign_name}</p>
          )}
          {result.product_name && (
            <p className="text-sm text-muted-foreground">Produto: {result.product_name}</p>
          )}
          {result.duplicate && (
            <p className="mt-3 rounded-xl bg-mango/40 p-3 text-sm">
              Esse cliente já tinha feito check-in neste evento.
            </p>
          )}
          {typeof result.rewards_granted === "number" && result.rewards_granted > 0 && (
            <p className="mt-3 rounded-xl bg-mango/40 p-3 text-sm font-semibold">
              {result.rewards_granted} mimo(s) liberado(s).
            </p>
          )}
        </section>
      )}
    </div>
  );
}
