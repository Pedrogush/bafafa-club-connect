import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type UIEvent,
} from "react";
import {
  ArrowDown,
  Ban,
  CalendarDays,
  Clock3,
  Flag,
  MessageCircleMore,
  RefreshCw,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
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
  const { roles } = useAuth();
  const search = Route.useSearch();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState("outro");
  const [reportDetails, setReportDetails] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [now, setNow] = useState(Date.now());
  const feedRef = useRef<HTMLDivElement | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);

  const selectedRoom = rooms.find((room) => room.event_id === selectedId) ?? null;
  const canModerate = roles.includes("admin") || roles.includes("moderador");
  const roomClosed = selectedRoom ? now > new Date(selectedRoom.chat_closes_at).getTime() : false;
  const participantCount = useMemo(
    () => new Set(messages.map((message) => message.author_id)).size,
    [messages],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

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
      const nextMessages = (data ?? []).map((message) => ({
        ...message,
        author_badges: Array.isArray(message.author_badges)
          ? (message.author_badges as unknown as BafafaBadgeDefinition[])
          : [],
      })) as ChatMessage[];

      const wasEmpty = messagesRef.current.length === 0;
      const oldIds = new Set(messagesRef.current.map((message) => message.message_id));
      const added = nextMessages.filter((message) => !oldIds.has(message.message_id));
      const ownAdded = added.some((message) => message.is_mine);
      messagesRef.current = nextMessages;
      setMessages(nextMessages);

      if (nearBottomRef.current || forceScrollRef.current || ownAdded || wasEmpty) {
        forceScrollRef.current = false;
        setNewMessages(0);
        window.requestAnimationFrame(() => scrollToBottom("smooth"));
      } else if (added.length > 0) {
        setNewMessages((count) => count + added.length);
      }
    }
    if (!quiet) setLoadingMessages(false);
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadRooms();
    } catch (roomError) {
      setError(
        roomError instanceof Error ? roomError.message : "Não foi possível abrir a Resenha.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadRooms]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!selectedId) {
      messagesRef.current = [];
      setMessages([]);
      return;
    }
    setError(null);
    setNewMessages(0);
    nearBottomRef.current = true;
    forceScrollRef.current = true;
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

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    feedEndRef.current?.scrollIntoView({ behavior, block: "end" });
    nearBottomRef.current = true;
    setNewMessages(0);
  }

  function handleFeedScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    nearBottomRef.current = distance < 90;
    if (nearBottomRef.current) setNewMessages(0);
  }

  async function refreshChat() {
    if (!selectedId) return;
    setRefreshing(true);
    await Promise.all([loadRooms(), loadMessages(selectedId, true)]);
    setRefreshing(false);
    toast.success("Resenha atualizada.");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !draft.trim() || sending || roomClosed) return;
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
    forceScrollRef.current = true;
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
      <header className="border-b border-foreground/10 bg-card px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="section-kicker text-muted-foreground">Só entra quem fez check-in</p>
            <h1 className="mt-1 font-display text-3xl leading-none">Resenha</h1>
          </div>
          <button
            type="button"
            onClick={() => void refreshChat()}
            disabled={refreshing || !selectedId}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-foreground/20 bg-background text-foreground disabled:opacity-50"
            aria-label="Atualizar Resenha"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {loading && <LoadingCard label="Abrindo a roda de conversa…" />}
      {error && !loading && (
        <div className="space-y-3">
          <ErrorCard message={error} />
          <div className="px-5">
            <button
              type="button"
              onClick={() => void initialize()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)]"
            >
              <RefreshCw className="h-4 w-4" /> Tentar de novo
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="px-3 pt-3">
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
            <section className="flex h-[calc(100dvh-9.8rem)] min-h-[430px] flex-col overflow-hidden rounded-3xl border-2 border-foreground/15 bg-card shadow-sm">
              <div className="border-b border-foreground/10 bg-card px-3 py-2.5">
                <select
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setReplyingTo(null);
                  }}
                  aria-label="Selecionar evento da Resenha"
                  className="h-10 w-full rounded-xl border border-foreground/20 bg-surface px-3 text-sm font-black outline-none focus:ring-4 focus:ring-lagoa/20"
                >
                  {rooms.map((room) => (
                    <option key={room.event_id} value={room.event_id}>
                      {room.event_name}
                    </option>
                  ))}
                </select>
                {selectedRoom && (
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />{" "}
                      {formatEventDate(selectedRoom.starts_at)} ·{" "}
                      {formatEventTime(selectedRoom.starts_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersRound className="h-3.5 w-3.5" /> {participantCount} na conversa
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" /> {roomClosed ? "encerrada" : "ao vivo"}
                    </span>
                  </div>
                )}
              </div>

              <div
                ref={feedRef}
                onScroll={handleFeedScroll}
                className="relative flex-1 space-y-2 overflow-y-auto bg-background px-3 py-3"
              >
                {loadingMessages ? (
                  <p className="py-16 text-center text-sm font-bold text-muted-foreground">
                    Puxando as últimas fofocas…
                  </p>
                ) : messages.length === 0 ? (
                  <div className="grid min-h-full place-items-center px-5 text-center">
                    <div>
                      <MessageCircleMore className="mx-auto h-9 w-9 text-primary" />
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
                        className={`max-w-[86%] rounded-2xl border px-3 py-2.5 ${
                          message.is_mine
                            ? "ml-auto border-lagoa/45 bg-lagoa/20"
                            : "mr-auto border-foreground/10 bg-card"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!message.is_mine && (
                            <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-foreground/20 bg-primary text-[10px] font-black text-white">
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
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <NameWithBadges
                                name={message.is_mine ? "Você" : message.author_name}
                                badges={message.author_badges}
                                maxBadges={2}
                                className="min-w-0 flex-1 text-[12px] font-black"
                              />
                              <time className="shrink-0 text-[9px] font-bold text-muted-foreground">
                                {formatMessageTime(message.created_at)}
                              </time>
                            </div>
                            {message.author_title && !message.is_mine && (
                              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                {message.author_title}
                              </p>
                            )}
                            {replied && (
                              <div className="mt-1.5 rounded-lg border-l-2 border-primary bg-background/70 px-2 py-1.5 text-[11px] text-muted-foreground">
                                <strong>{replied.is_mine ? "Você" : replied.author_name}:</strong>{" "}
                                {replied.body.slice(0, 72)}
                              </div>
                            )}
                            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {message.body}
                            </p>
                            <div className="mt-1 flex justify-end gap-0.5 text-muted-foreground">
                              <MessageAction
                                label="Responder"
                                onClick={() => setReplyingTo(message)}
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </MessageAction>
                              {(message.is_mine || canModerate) && (
                                <MessageAction
                                  label="Apagar"
                                  onClick={() => void deleteMessage(message)}
                                  destructive
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </MessageAction>
                              )}
                              {!message.is_mine && (
                                <>
                                  <MessageAction
                                    label="Denunciar"
                                    onClick={() => setReporting(message)}
                                  >
                                    <Flag className="h-3.5 w-3.5" />
                                  </MessageAction>
                                  <MessageAction
                                    label="Bloquear"
                                    onClick={() => void blockUser(message)}
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </MessageAction>
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

                {newMessages > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToBottom()}
                    className="sticky bottom-2 left-1/2 z-10 mx-auto flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground px-3 py-2 text-xs font-black text-background shadow-lg"
                  >
                    <ArrowDown className="h-3.5 w-3.5" /> {newMessages} nova
                    {newMessages > 1 ? "s" : ""}
                  </button>
                )}
              </div>

              {roomClosed ? (
                <div className="border-t border-foreground/10 bg-muted px-4 py-3 text-center">
                  <p className="text-sm font-black">Resenha encerrada.</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    As mensagens ficam somente para consulta.
                  </p>
                </div>
              ) : (
                <form onSubmit={sendMessage} className="border-t border-foreground/10 bg-card p-3">
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
                      rows={1}
                      className="max-h-28 min-h-11 resize-none rounded-2xl border border-foreground/20 bg-background"
                    />
                    <Button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="h-11 w-11 shrink-0 rounded-full p-0"
                      aria-label="Enviar mensagem"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="mt-1 text-right text-[9px] font-bold text-muted-foreground">
                    {draft.length}/300
                  </p>
                </form>
              )}
            </section>
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

function MessageAction({
  label,
  onClick,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-full hover:bg-background ${destructive ? "hover:text-destructive" : "hover:text-foreground"}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}
