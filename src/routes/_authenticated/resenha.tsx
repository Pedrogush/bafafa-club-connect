import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Ban,
  Clock3,
  Flag,
  MessageCircleMore,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { NameWithBadges, type BafafaBadgeDefinition } from "@/components/profile/bafafa-badge";
import { ErrorCard, LoadingCard } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate, formatEventTime } from "@/lib/bafafa";

export const Route = createFileRoute("/_authenticated/resenha")({
  validateSearch: (search: Record<string, unknown>) => ({
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  component: Resenha,
});

type ChatRoom = {
  event_id: string;
  event_name: string;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  category: string;
  chat_closes_at: string;
  message_count: number;
  last_message_at: string | null;
};

type ChatMessage = {
  message_id: string;
  event_id: string;
  author_id: string;
  body: string;
  reply_to: string | null;
  created_at: string;
  author_name: string;
  author_username: string | null;
  author_avatar_url: string | null;
  author_title: string | null;
  author_badges: BafafaBadgeDefinition[];
  is_mine: boolean;
};

const REPORT_REASONS = [
  ["spam", "Spam ou divulgação"],
  ["assedio", "Assédio ou insistência"],
  ["ofensa", "Ofensa ou discriminação"],
  ["exposicao", "Exposição de alguém"],
  ["outro", "Outro motivo"],
] as const;

function Resenha() {
  const { user, roles } = useAuth();
  const search = Route.useSearch();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState("outro");
  const [reportDetails, setReportDetails] = useState("");
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const selectedRoom = rooms.find((room) => room.event_id === selectedId) ?? null;
  const canModerate = roles.includes("admin") || roles.includes("moderador");

  const loadRooms = useCallback(async () => {
    const { data, error: roomError } = await supabase.rpc("my_event_chat_rooms");
    if (roomError) throw roomError;
    const nextRooms = (data ?? []).map((room) => ({
      ...room,
      message_count: Number(room.message_count ?? 0),
    })) as ChatRoom[];
    setRooms(nextRooms);
    setSelectedId((current) => {
      if (current && nextRooms.some((room) => room.event_id === current)) return current;
      if (search.event && nextRooms.some((room) => room.event_id === search.event))
        return search.event;
      return nextRooms[0]?.event_id ?? "";
    });
  }, [search.event]);

  const loadMessages = useCallback(async (eventId: string, quiet = false) => {
    if (!quiet) setLoadingMessages(true);
    const { data, error: feedError } = await supabase.rpc("get_event_chat_feed", {
      _event_id: eventId,
      _limit: 100,
    });
    if (feedError) {
      if (!quiet) setError(feedError.message);
    } else {
      setMessages(
        (data ?? []).map((message) => ({
          ...message,
          author_badges: Array.isArray(message.author_badges)
            ? (message.author_badges as unknown as BafafaBadgeDefinition[])
            : [],
        })) as ChatMessage[],
      );
    }
    if (!quiet) setLoadingMessages(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadRooms()
      .catch((roomError: unknown) => {
        if (mounted)
          setError(
            roomError instanceof Error ? roomError.message : "Não foi possível abrir a Resenha.",
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadRooms]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setError(null);
    void loadMessages(selectedId);

    const channel = supabase
      .channel(`event-chat-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_chat_messages",
          filter: `event_id=eq.${selectedId}`,
        },
        () => void loadMessages(selectedId, true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMessages, selectedId]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    const { error: sendError } = await supabase.rpc("send_event_chat_message", {
      _event_id: selectedId,
      _body: draft.trim(),
      _reply_to: replyingTo?.message_id ?? null,
    });
    setSending(false);
    if (sendError) return toast.error(sendError.message);
    setDraft("");
    setReplyingTo(null);
    await loadMessages(selectedId, true);
  }

  async function deleteMessage(message: ChatMessage) {
    const copy = message.is_mine ? "Apagar sua mensagem?" : "Ocultar esta mensagem da Resenha?";
    if (!window.confirm(copy)) return;
    const { error: deleteError } = await supabase.rpc("delete_event_chat_message", {
      _message_id: message.message_id,
    });
    if (deleteError) return toast.error(deleteError.message);
    toast.success(message.is_mine ? "Mensagem apagada." : "Mensagem retirada da Resenha.");
    await loadMessages(selectedId, true);
  }

  async function blockUser(message: ChatMessage) {
    if (
      !window.confirm(
        `Bloquear ${message.author_name}? Vocês deixam de ver as mensagens um do outro.`,
      )
    )
      return;
    const { error: blockError } = await supabase.rpc("set_event_chat_block", {
      _blocked_user_id: message.author_id,
      _blocked: true,
    });
    if (blockError) return toast.error(blockError.message);
    toast.success("Usuário bloqueado nesta experiência.");
    await loadMessages(selectedId, true);
  }

  async function submitReport() {
    if (!reporting) return;
    const { error: reportError } = await supabase.rpc("report_event_chat_message", {
      _message_id: reporting.message_id,
      _reason: reportReason,
      _details: reportDetails.trim() || null,
    });
    if (reportError) return toast.error(reportError.message);
    setReporting(null);
    setReportDetails("");
    setReportReason("outro");
    toast.success("Denúncia enviada para a moderação.");
  }

  return (
    <AppShell>
      <ScreenHeader eyebrow="Só entra quem fez check-in" title="Resenha" tone="green" />
      {loading && <LoadingCard label="Abrindo a roda de conversa…" />}
      {error && !loading && <ErrorCard message={error} />}

      {!loading && !error && (
        <div className="space-y-4 px-5 pt-2">
          {rooms.length === 0 ? (
            <section className="poster-card checker-texture p-6 text-foreground">
              <MessageCircleMore className="h-9 w-9" />
              <h2 className="mt-4 font-display text-4xl leading-none">
                A Resenha começa no check-in.
              </h2>
              <p className="mt-3 text-sm font-semibold opacity-75">
                Faça check-in em um evento com a sala liberada para conversar com quem está no
                Bafafá.
              </p>
              <Link
                to="/checkin"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-foreground bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
              >
                Abrir meu check-in <ShieldCheck className="h-4 w-4" />
              </Link>
            </section>
          ) : (
            <>
              <section className="sticker-card bg-card p-4">
                <label className="section-kicker text-muted-foreground">
                  Qual roda está aberta?
                </label>
                <select
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setReplyingTo(null);
                  }}
                  className="mt-3 w-full rounded-xl border-2 border-foreground bg-surface px-4 py-3 font-black outline-none focus:ring-4 focus:ring-lagoa/25"
                >
                  {rooms.map((room) => (
                    <option key={room.event_id} value={room.event_id}>
                      {room.event_name}
                    </option>
                  ))}
                </select>
                {selectedRoom && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-muted-foreground">
                    <span className="rounded-full bg-muted px-3 py-1.5">
                      {formatEventDate(selectedRoom.starts_at)} ·{" "}
                      {formatEventTime(selectedRoom.starts_at)}
                    </span>
                    <span className="rounded-full bg-lagoa px-3 py-1.5 text-foreground">
                      {selectedRoom.message_count} mensagens
                    </span>
                  </div>
                )}
              </section>

              <section className="poster-card overflow-hidden bg-card">
                <div className="flex items-center justify-between gap-3 border-b-2 border-foreground bg-foreground px-4 py-3 text-background">
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-mango" />
                    <div>
                      <p className="font-poster text-base">Resenha do evento</p>
                      <p className="text-[10px] font-bold opacity-65">
                        Sem anonimato · com respeito · sem exposição
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold opacity-70">
                    <Clock3 className="h-3.5 w-3.5" /> ao vivo
                  </span>
                </div>

                <div className="max-h-[52vh] min-h-80 space-y-3 overflow-y-auto bg-confete p-4">
                  {loadingMessages ? (
                    <p className="py-16 text-center text-sm font-bold text-muted-foreground">
                      Puxando as últimas fofocas…
                    </p>
                  ) : messages.length === 0 ? (
                    <div className="grid min-h-72 place-items-center text-center">
                      <div>
                        <MessageCircleMore className="mx-auto h-10 w-10 text-primary" />
                        <p className="mt-3 font-display text-3xl">
                          A primeira mensagem pode ser sua.
                        </p>
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">
                          Puxe assunto sem entregar ninguém.
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const replied = message.reply_to
                        ? messages.find((candidate) => candidate.message_id === message.reply_to)
                        : null;
                      return (
                        <article
                          key={message.message_id}
                          className={`max-w-[92%] rounded-2xl border-2 border-foreground p-3 shadow-[2px_3px_0_var(--foreground)] ${
                            message.is_mine ? "ml-auto bg-lagoa" : "bg-background"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-foreground bg-primary font-display text-white">
                              {message.author_avatar_url ? (
                                <img
                                  src={message.author_avatar_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (message.author_name[0]?.toUpperCase() ?? "B")
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <NameWithBadges
                                  name={message.author_name}
                                  badges={message.author_badges}
                                  className="text-sm font-black"
                                />
                                <time className="text-[10px] font-bold opacity-50">
                                  {formatMessageTime(message.created_at)}
                                </time>
                              </div>
                              {message.author_title && (
                                <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide opacity-60">
                                  {message.author_title}
                                </p>
                              )}
                              {replied && (
                                <div className="mt-2 rounded-xl border-l-[3px] border-primary bg-foreground/5 px-3 py-2 text-xs opacity-70">
                                  <strong>{replied.author_name}:</strong>{" "}
                                  {replied.body.slice(0, 90)}
                                </div>
                              )}
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed">
                                {message.body}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-black opacity-60">
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(message)}
                                  className="inline-flex items-center gap-1 hover:opacity-100"
                                >
                                  <Reply className="h-3.5 w-3.5" /> responder
                                </button>
                                {(message.is_mine || canModerate) && (
                                  <button
                                    type="button"
                                    onClick={() => void deleteMessage(message)}
                                    className="inline-flex items-center gap-1 hover:text-destructive hover:opacity-100"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> apagar
                                  </button>
                                )}
                                {!message.is_mine && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setReporting(message)}
                                      className="inline-flex items-center gap-1 hover:opacity-100"
                                    >
                                      <Flag className="h-3.5 w-3.5" /> denunciar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void blockUser(message)}
                                      className="inline-flex items-center gap-1 hover:opacity-100"
                                    >
                                      <Ban className="h-3.5 w-3.5" /> bloquear
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                  <div ref={feedEndRef} />
                </div>

                <form
                  onSubmit={sendMessage}
                  className="border-t-2 border-foreground bg-background p-3"
                >
                  {replyingTo && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-bold">
                      <Reply className="h-3.5 w-3.5" />
                      <span className="min-w-0 flex-1 truncate">
                        Respondendo {replyingTo.author_name}: {replyingTo.body}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        aria-label="Cancelar resposta"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value.slice(0, 300))}
                      placeholder="Manda a boa, Bafafã…"
                      rows={2}
                      className="min-h-12 resize-none border-2 border-foreground"
                    />
                    <Button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="h-12 w-12 shrink-0 p-0"
                      aria-label="Enviar mensagem"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="mt-1 text-right text-[10px] font-bold text-muted-foreground">
                    {draft.length}/300
                  </p>
                </form>
              </section>

              <p className="px-3 pb-3 text-center text-[11px] font-semibold text-muted-foreground">
                Seu telefone e outros dados privados nunca aparecem na sala. Você pode denunciar e
                bloquear sem avisar a outra pessoa.
              </p>
            </>
          )}
        </div>
      )}

      <Dialog open={Boolean(reporting)} onOpenChange={(open) => !open && setReporting(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Denunciar mensagem</DialogTitle>
            <DialogDescription>
              A moderação recebe a denúncia sem informar seu nome ao autor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="report-reason">Motivo</Label>
              <select
                id="report-reason"
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border-2 border-foreground bg-background px-3 text-sm font-bold"
              >
                {REPORT_REASONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="report-details">Conte o que aconteceu (opcional)</Label>
              <Textarea
                id="report-details"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value.slice(0, 500))}
                rows={4}
                className="mt-2 border-2 border-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReporting(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submitReport()}>
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}
