import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Gift,
  LocateFixed,
  MapPin,
  MessageCircleMore,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { SecureQr } from "@/components/operations/secure-qr";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate, formatEventTime } from "@/lib/bafafa";
import { publicErrorMessage } from "@/lib/public-error";
import { geolocationErrorMessage, getBestGeolocationPosition } from "@/lib/geolocation";
import { useAuth } from "@/hooks/use-auth";

type EventRow = {
  id: string;
  name: string;
  starts_at: string;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  status: string;
  chat_enabled: boolean;
  geolocation_checkin_enabled: boolean;
  geofence_radius_m: number;
  max_location_accuracy_m: number;
  venue_address: string | null;
};

type TokenResult = { token: string; short_code: string; expires_at: string };

export const Route = createFileRoute("/_authenticated/checkin")({
  validateSearch: (search: Record<string, unknown>) => ({
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  component: Checkin,
});

function Checkin() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedId, setSelectedId] = useState(search.event ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [token, setToken] = useState<TokenResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resultCopy, setResultCopy] = useState<string | null>(null);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("events")
      .select(
        "id,name,starts_at,checkin_opens_at,checkin_closes_at,status,chat_enabled,geolocation_checkin_enabled,geofence_radius_m,max_location_accuracy_m,venue_address",
      )
      .eq("checkin_enabled", true)
      .in("status", ["scheduled", "published", "ongoing"])
      .order("starts_at", { ascending: true });
    if (queryError) setError(queryError.message);
    else {
      const rows = (data ?? []) as EventRow[];
      setEvents(rows);
      setSelectedId((current) => {
        if (current && rows.some((event) => event.id === current)) return current;
        return rows.find((event) => windowOpen(event))?.id ?? rows[0]?.id ?? "";
      });
    }
    setLoading(false);
  }, []);

  const checkConfirmation = useCallback(async () => {
    if (!user || !selectedId) return false;
    const { data } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", selectedId)
      .maybeSingle();
    const found = Boolean(data);
    setConfirmed(found);
    return found;
  }, [selectedId, user]);

  useEffect(() => void load(), [load]);
  useEffect(() => void checkConfirmation(), [checkConfirmation]);

  const selected = events.find((event) => event.id === selectedId) ?? null;
  const phase = selected ? windowPhase(selected) : "closed";

  async function doGeolocationCheckin() {
    if (!selected || phase !== "open" || geolocating) return;
    setGeolocating(true);
    setResultCopy(null);
    setLocationHint("Buscando a melhor leitura de localização…");

    try {
      const position = await getBestGeolocationPosition({
        targetAccuracyM: Math.min(selected.max_location_accuracy_m || 80, 80),
        timeoutMs: 20_000,
        onProgress: ({ accuracyM }) => {
          const rounded = Math.round(accuracyM);
          setLocationHint(
            rounded <= selected.max_location_accuracy_m
              ? `Localização encontrada com precisão aproximada de ${rounded} m.`
              : `Precisão atual: ${rounded} m. Tentando melhorar o sinal…`,
          );
        },
      });

      const { latitude, longitude, accuracy } = position.coords;
      setLocationHint(
        `Validando sua presença com precisão aproximada de ${Math.round(accuracy)} m…`,
      );

      const { data, error: rpcError } = await supabase.rpc("checkin_with_geolocation", {
        _event_id: selected.id,
        _latitude: latitude,
        _longitude: longitude,
        _accuracy_m: accuracy,
      });

      if (rpcError) {
        const message = publicErrorMessage(
          rpcError,
          "Não conseguimos confirmar que você está no Bafafá.",
        );
        setLocationHint(message);
        toast.error(message);
        return;
      }

      const response = data as {
        distance_m?: number;
        rewards_granted?: number;
        duplicate?: boolean;
      } | null;
      setConfirmed(true);
      setLocationHint(null);
      setResultCopy(
        response?.duplicate
          ? "Seu check-in já estava confirmado."
          : `Presença confirmada${response?.distance_m !== undefined ? ` a aproximadamente ${Math.round(response.distance_m)} m do ponto do evento` : ""}.`,
      );
      toast.success("Check-in realizado!");
    } catch (geoError) {
      const message = geolocationErrorMessage(geoError);
      setLocationHint(message);
      toast.error(message);
    } finally {
      setGeolocating(false);
    }
  }

  async function generateQrFallback() {
    if (!selected || phase !== "open" || generating) return;
    setGenerating(true);
    setQrError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("create_my_qr_token", {
        _purpose: "checkin",
        _ref_id: selected.id,
      });

      if (rpcError) {
        const message = publicErrorMessage(rpcError, "Não foi possível gerar o QR alternativo.");
        setQrError(message);
        toast.error(message);
        return;
      }

      const row = Array.isArray(data) ? data[0] : null;
      if (!row?.token || !row.short_code || !row.expires_at) {
        const message = "Não foi possível gerar o código. Tente novamente.";
        setQrError(message);
        toast.error(message);
        return;
      }

      setToken(row as TokenResult);
    } catch (qrGenerationError) {
      console.error("Erro ao gerar QR alternativo", qrGenerationError);
      const message = "Não foi possível gerar o QR alternativo. Tente novamente.";
      setQrError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        eyebrow="Dentro do evento"
        title="Check-in"
        tone="blue"
        action={
          <Link
            to="/eventos"
            aria-label="Voltar aos eventos"
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-foreground bg-background text-foreground shadow-[2px_3px_0_var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      {loading && <LoadingCard label="Localizando o evento…" />}
      {error && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-5 px-5 pt-2">
          {events.length === 0 ? (
            <section className="poster-card checker-texture p-6 text-foreground">
              <MapPin className="h-8 w-8" />
              <h2 className="mt-4 font-display text-4xl leading-none">
                Nenhum check-in aberto agora.
              </h2>
              <Link to="/eventos" className="mt-5 inline-flex items-center gap-2 font-black">
                Ver agenda <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </section>
          ) : (
            <>
              <section className="sticker-card bg-card p-5">
                <label className="section-kicker text-muted-foreground">Evento</label>
                <select
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setConfirmed(false);
                    setToken(null);
                    setResultCopy(null);
                    setLocationHint(null);
                    setQrError(null);
                  }}
                  className="mt-3 w-full rounded-xl border-2 border-foreground bg-surface px-4 py-3 font-black"
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
                      <Clock3 className="h-4 w-4 text-primary" />{" "}
                      {formatEventDate(selected.starts_at)} · {formatEventTime(selected.starts_at)}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brick" />{" "}
                      {selected.venue_address ?? "Praça Dr. Amaro de Souza · Lagoa Nova"}
                    </p>
                    <span
                      className={`mt-1 w-fit rounded-full px-3 py-1 text-xs font-black ${phase === "open" ? "bg-primary/15 text-primary" : "bg-muted"}`}
                    >
                      {phase === "before"
                        ? "Ainda não abriu"
                        : phase === "open"
                          ? "Check-in liberado"
                          : "Check-in encerrado"}
                    </span>
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
                    {resultCopy ??
                      "A Resenha, os selos e as missões elegíveis já foram atualizados."}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Link
                      to="/mimos"
                      className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-mango px-4 py-3 text-center text-sm font-black text-foreground shadow-[4px_5px_0_var(--foreground)]"
                    >
                      Ver Fofoquinhas <Gift className="h-4 w-4" />
                    </Link>
                    {selected?.chat_enabled && (
                      <Link
                        to="/resenha"
                        search={{ event: selected.id }}
                        className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background px-4 py-3 text-center text-sm font-black text-foreground shadow-[4px_5px_0_var(--foreground)]"
                      >
                        Entrar na Resenha <MessageCircleMore className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                  <div className="mt-5 rounded-2xl border-2 border-white/35 bg-white/10 p-4">
                    <p className="font-black">Tem promoção com desconto ou cortesia?</p>
                    <p className="mt-1 text-xs font-semibold text-white/80">
                      A localização confirma sua presença. Para liberar benefícios de valor
                      financeiro, gere o QR e peça a confirmação da equipe.
                    </p>
                    {!token ? (
                      <button
                        type="button"
                        disabled={generating || phase !== "open"}
                        onClick={() => void generateQrFallback()}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background px-4 py-3 text-sm font-black text-foreground shadow-[3px_4px_0_var(--foreground)] disabled:opacity-50"
                      >
                        <QrCode className="h-4 w-4" />{" "}
                        {generating ? "Gerando…" : "Validar promoções com a equipe"}
                      </button>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-background p-4 text-center text-foreground">
                        <SecureQr
                          value={token.token}
                          shortCode={token.short_code}
                          expiresAt={token.expires_at}
                          size={190}
                        />
                        <p className="mt-1 text-xs font-bold text-muted-foreground">
                          Código temporário para confirmação operacional
                        </p>
                      </div>
                    )}
                    {qrError && (
                      <p
                        role="alert"
                        className="mt-3 rounded-xl bg-white/15 p-3 text-xs font-bold text-white"
                      >
                        {qrError}
                      </p>
                    )}
                  </div>
                </section>
              ) : (
                <>
                  <section className="poster-card checker-texture p-6 text-foreground">
                    <span className="cut-label bg-white">forma principal</span>
                    <LocateFixed className="mt-6 h-10 w-10" />
                    <h2 className="mt-3 font-display text-4xl leading-none">Já tô no Bafafá</h2>
                    <p className="mt-3 text-sm font-semibold opacity-75">
                      O app verifica uma única vez se você está na casa ou na praça. Não
                      acompanhamos sua localização depois disso.
                    </p>
                    {selected?.geolocation_checkin_enabled ? (
                      <button
                        type="button"
                        disabled={geolocating || phase !== "open"}
                        onClick={() => void doGeolocationCheckin()}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[4px_5px_0_var(--foreground)] disabled:opacity-50"
                      >
                        {geolocating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <LocateFixed className="h-4 w-4" />
                        )}
                        {geolocating ? "Confirmando localização…" : "Confirmar minha presença"}
                      </button>
                    ) : (
                      <p className="mt-5 rounded-xl border-2 border-dashed border-foreground/20 bg-white/60 p-3 text-xs font-bold">
                        A equipe ainda não configurou o check-in por localização neste evento. Use a
                        alternativa abaixo.
                      </p>
                    )}
                    {locationHint && (
                      <p className="mt-3 rounded-xl border border-foreground/15 bg-white/65 p-3 text-xs font-bold">
                        {locationHint}
                      </p>
                    )}
                  </section>

                  <section className="sticker-card bg-card p-5">
                    <div className="flex items-start gap-3">
                      <QrCode className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                      <div>
                        <h3 className="font-display text-2xl">Não deu com a localização?</h3>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          Gere um QR temporário e peça para a equipe validar.
                        </p>
                      </div>
                    </div>
                    {!token ? (
                      <button
                        type="button"
                        disabled={generating || phase !== "open"}
                        onClick={() => void generateQrFallback()}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background px-4 py-3 text-sm font-black shadow-[3px_4px_0_var(--foreground)] disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />{" "}
                        {generating ? "Gerando…" : "Gerar QR alternativo"}
                      </button>
                    ) : (
                      <div className="mt-4 text-center">
                        <SecureQr
                          value={token.token}
                          shortCode={token.short_code}
                          expiresAt={token.expires_at}
                          size={210}
                        />
                        <button
                          type="button"
                          onClick={() => void checkConfirmation()}
                          className="mt-3 inline-flex items-center gap-2 text-xs font-black text-primary"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Já validaram? Atualizar
                        </button>
                      </div>
                    )}
                    {qrError && (
                      <p
                        role="alert"
                        className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs font-bold text-destructive"
                      >
                        {qrError}
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function windowPhase(event: EventRow): "before" | "open" | "closed" {
  const now = Date.now();
  const starts = new Date(event.starts_at).getTime();
  const opens = event.checkin_opens_at
    ? new Date(event.checkin_opens_at).getTime()
    : starts - 2 * 60 * 60 * 1000;
  const closes = event.checkin_closes_at
    ? new Date(event.checkin_closes_at).getTime()
    : starts + 6 * 60 * 60 * 1000;
  if (now < opens) return "before";
  if (now > closes) return "closed";
  return "open";
}

function windowOpen(event: EventRow) {
  return windowPhase(event) === "open";
}
