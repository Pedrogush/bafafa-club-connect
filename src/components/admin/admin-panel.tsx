import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Crown,
  Copy,
  Edit3,
  Eye,
  Gift,
  Loader2,
  MessageCircleMore,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TimerOff,
  Target,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { campaignBenefitLabel, formatDateTime } from "@/lib/bafafa";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { ManagementDashboard } from "@/components/admin/management-dashboard";

export type AdminSection =
  | "overview"
  | "management"
  | "events"
  | "campaigns"
  | "clients"
  | "checkins"
  | "chat"
  | "team"
  | "audit";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PreferenceRow = Database["public"]["Tables"]["user_preferences"]["Row"];
type CheckinRow = Database["public"]["Tables"]["checkins"]["Row"];
type RoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
type RewardRow = Database["public"]["Tables"]["user_rewards"]["Row"];
type RedemptionRow = Database["public"]["Tables"]["reward_redemptions"]["Row"];
type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type BadgeDefinitionRow = Database["public"]["Tables"]["badge_definitions"]["Row"];
type UserBadgeRow = Database["public"]["Tables"]["user_badges"]["Row"];
type ChatReportRow = Database["public"]["Tables"]["event_chat_reports"]["Row"];
type ChatMessageRow = Database["public"]["Tables"]["event_chat_messages"]["Row"];
type ProfileCompletionRow = { user_id: string; percentage: number; details: unknown };

type AdminData = {
  events: EventRow[];
  campaigns: CampaignRow[];
  profiles: ProfileRow[];
  preferences: PreferenceRow[];
  checkins: CheckinRow[];
  roles: RoleRow[];
  rewards: RewardRow[];
  redemptions: RedemptionRow[];
  audits: AuditRow[];
  badgeDefinitions: BadgeDefinitionRow[];
  userBadges: UserBadgeRow[];
  profileCompletions: ProfileCompletionRow[];
  chatReports: ChatReportRow[];
  chatMessages: ChatMessageRow[];
};

const EMPTY_DATA: AdminData = {
  events: [],
  campaigns: [],
  profiles: [],
  preferences: [],
  checkins: [],
  roles: [],
  rewards: [],
  redemptions: [],
  audits: [],
  badgeDefinitions: [],
  userBadges: [],
  profileCompletions: [],
  chatReports: [],
  chatMessages: [],
};

const NAV_ITEMS: Array<{ key: AdminSection; label: string; icon: typeof BarChart3 }> = [
  { key: "overview", label: "Visão geral", icon: BarChart3 },
  { key: "management", label: "Gestão e piloto", icon: Target },
  { key: "events", label: "Eventos", icon: CalendarDays },
  { key: "campaigns", label: "Campanhas", icon: Gift },
  { key: "clients", label: "Clientes", icon: Users },
  { key: "checkins", label: "Check-ins", icon: CheckCircle2 },
  { key: "chat", label: "Resenha", icon: MessageCircleMore },
  { key: "team", label: "Equipe", icon: UserCog },
  { key: "audit", label: "Auditoria", icon: ClipboardList },
];

export function AdminPanel({ currentUserId }: { currentUserId: string }) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [data, setData] = useState<AdminData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const [
      events,
      campaigns,
      profiles,
      preferences,
      checkins,
      roles,
      rewards,
      redemptions,
      audits,
      badgeDefinitions,
      userBadges,
      profileCompletions,
      chatReports,
      chatMessages,
    ] = await Promise.all([
      supabase.from("events").select("*").order("starts_at", { ascending: false }),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", {
        ascending: false,
      }),
      supabase.from("user_preferences").select("*"),
      supabase.from("checkins").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("user_roles").select("*"),
      supabase
        .from("user_rewards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("reward_redemptions")
        .select("*")
        .order("redeemed_at", { ascending: false })
        .limit(1000),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("badge_definitions").select("*").order("sort_order"),
      supabase.from("user_badges").select("*"),
      supabase.rpc("admin_profile_completion_overview"),
      supabase
        .from("event_chat_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("event_chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const firstError = [
      events,
      campaigns,
      profiles,
      preferences,
      checkins,
      roles,
      rewards,
      redemptions,
      audits,
      badgeDefinitions,
      userBadges,
      profileCompletions,
      chatReports,
      chatMessages,
    ]
      .map((result) => result.error)
      .find(Boolean);

    if (firstError) {
      setError(firstError.message);
      toast.error("Não foi possível carregar o painel.");
    } else {
      setData({
        events: events.data ?? [],
        campaigns: campaigns.data ?? [],
        profiles: profiles.data ?? [],
        preferences: preferences.data ?? [],
        checkins: checkins.data ?? [],
        roles: roles.data ?? [],
        rewards: rewards.data ?? [],
        redemptions: redemptions.data ?? [],
        audits: audits.data ?? [],
        badgeDefinitions: badgeDefinitions.data ?? [],
        userBadges: userBadges.data ?? [],
        profileCompletions: (profileCompletions.data ?? []) as ProfileCompletionRow[],
        chatReports: chatReports.data ?? [],
        chatMessages: chatMessages.data ?? [],
      });
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="app-canvas min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Wordmark variant="short" />
            <div className="hidden min-w-0 sm:block">
              <p className="section-kicker text-muted-foreground">Painel administrativo</p>
              <p className="truncate font-display text-2xl leading-none">Clube dos Bafafãs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Link
              to="/inicio"
              className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Voltar ao app
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <nav className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-black transition ${
                section === key
                  ? "border-foreground bg-mango text-foreground shadow-[2px_3px_0_var(--foreground)]"
                  : "border-foreground/15 bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="card-festa grid min-h-64 place-items-center p-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Organizando o Bafafá…</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-destructive/35 bg-destructive/10 p-6">
            <p className="font-display text-xl">Deu ruim no painel.</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => void loadData()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {section === "overview" && <Overview data={data} />}
            {section === "management" && (
              <ManagementDashboard data={data} currentUserId={currentUserId} />
            )}
            {section === "events" && (
              <EventsManager events={data.events} onChanged={() => void loadData(true)} />
            )}
            {section === "campaigns" && (
              <CampaignsManager
                campaigns={data.campaigns}
                events={data.events}
                rewards={data.rewards}
                redemptions={data.redemptions}
                profiles={data.profiles}
                onChanged={() => void loadData(true)}
              />
            )}
            {section === "clients" && (
              <ClientsManager data={data} onChanged={() => void loadData(true)} />
            )}
            {section === "checkins" && <CheckinsManager data={data} />}
            {section === "chat" && (
              <ChatModerationManager data={data} onChanged={() => void loadData(true)} />
            )}
            {section === "team" && (
              <TeamManager
                profiles={data.profiles}
                roles={data.roles}
                currentUserId={currentUserId}
                onChanged={() => void loadData(true)}
              />
            )}
            {section === "audit" && <AuditManager data={data} />}
          </>
        )}
      </div>
    </div>
  );
}

function Overview({ data }: { data: AdminData }) {
  const now = Date.now();
  const metrics = [
    {
      label: "Clientes cadastrados",
      value: data.profiles.length,
      copy: `${data.profiles.filter((profile) => profile.created_at && new Date(profile.created_at).getTime() > now - 7 * 86400000).length} nos últimos 7 dias`,
      icon: Users,
    },
    {
      label: "Próximos eventos",
      value: data.events.filter((event) => new Date(event.starts_at).getTime() >= now).length,
      copy: `${data.events.filter((event) => event.status === "ongoing").length} rolando agora`,
      icon: CalendarDays,
    },
    {
      label: "Check-ins",
      value: data.checkins.length,
      copy: `${data.checkins.filter((checkin) => new Date(checkin.created_at).getTime() > now - 7 * 86400000).length} nos últimos 7 dias`,
      icon: CheckCircle2,
    },
    {
      label: "Mimos utilizados",
      value: data.rewards.filter((reward) => reward.status === "redeemed").length,
      copy: `${data.rewards.filter((reward) => reward.status === "available").length} ainda disponíveis`,
      icon: Gift,
    },
  ];

  const profileCompletionByUser = new Map(
    data.profileCompletions.map((row) => [row.user_id, Number(row.percentage ?? 0)]),
  );

  const latestEvents = [...data.events]
    .filter((event) => new Date(event.starts_at).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          O Bafafá em números
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Visão geral</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, copy, icon: Icon }, index) => (
          <div key={label} className="sticker-card bg-card p-5">
            <div
              className={`grid h-11 w-11 place-items-center rounded-full ${
                ["bg-primary text-primary-foreground", "bg-mango", "bg-samba", "bg-sky text-white"][
                  index
                ]
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-4xl">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card-festa p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Agenda
              </p>
              <h2 className="mt-1 font-display text-2xl">Próximos eventos</h2>
            </div>
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-5 space-y-3">
            {latestEvents.length === 0 ? (
              <EmptyMessage>Cadastre o primeiro evento para preencher a agenda.</EmptyMessage>
            ) : (
              latestEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-input p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{event.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(event.starts_at)} · {event.attraction || event.category}
                      </p>
                    </div>
                    <StatusPill status={event.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card-festa p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Aquisição de dados
          </p>
          <h2 className="mt-1 font-display text-2xl">Perfis completos</h2>
          <div className="mt-5 space-y-3">
            {[100, 60, 40].map((threshold) => {
              const count = data.profiles.filter(
                (profile) => (profileCompletionByUser.get(profile.id) ?? 0) >= threshold,
              ).length;
              return (
                <div key={threshold} className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">
                      {threshold === 100 ? "100% completos" : `${threshold}% ou mais`}
                    </span>
                    <span className="font-display text-xl">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function EventsManager({ events, onChanged }: { events: EventRow[]; onChanged: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [previewing, setPreviewing] = useState<EventRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const filtered = events.filter((event) => {
    const matchesSearch = `${event.name} ${event.category} ${event.attraction ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "all" || event.status === statusFilter);
  });

  async function updateStatus(event: EventRow, status: string) {
    setWorkingId(event.id);
    const payload: EventUpdate = {
      status,
      ...(status === "ended"
        ? {
            checkin_closes_at: event.checkin_closes_at ?? new Date().toISOString(),
            chat_closes_at: event.chat_closes_at ?? new Date().toISOString(),
          }
        : {}),
    };
    const { error } = await supabase.from("events").update(payload).eq("id", event.id);
    setWorkingId(null);
    if (error) return toast.error(error.message);
    toast.success(
      status === "published"
        ? "Evento publicado."
        : status === "ongoing"
          ? "Evento marcado como rolando."
          : "Status atualizado.",
    );
    onChanged();
  }

  async function duplicate(event: EventRow) {
    setWorkingId(event.id);
    const { data, error } = await supabase.rpc("duplicate_event_with_campaigns", {
      _event_id: event.id,
    });
    setWorkingId(null);
    if (error) return toast.error(error.message);
    toast.success("Cópia criada como rascunho, com campanhas pausadas.");
    onChanged();
    if (data) {
      const duplicatedId = String(data);
      window.setTimeout(() => {
        const duplicated = events.find((item) => item.id === duplicatedId);
        if (duplicated) {
          setEditing(duplicated);
          setDialogOpen(true);
        }
      }, 0);
    }
  }

  async function closeCheckin(event: EventRow) {
    if (!window.confirm(`Encerrar o check-in de “${event.name}” agora?`)) return;
    setWorkingId(event.id);
    const { error } = await supabase.rpc("close_event_checkin", { _event_id: event.id });
    setWorkingId(null);
    if (error) return toast.error(error.message);
    toast.success("Check-in encerrado agora.");
    onChanged();
  }

  async function remove(event: EventRow) {
    if (!window.confirm(`Remover o evento “${event.name}” da agenda?`)) return;
    const [checkins, campaigns] = await Promise.all([
      supabase
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
    ]);
    if (checkins.error || campaigns.error) {
      return toast.error(
        checkins.error?.message ??
          campaigns.error?.message ??
          "Não foi possível verificar o evento.",
      );
    }
    if ((checkins.count ?? 0) > 0 || (campaigns.count ?? 0) > 0) {
      const { error } = await supabase
        .from("events")
        .update({ status: "cancelled", checkin_enabled: false, chat_enabled: false })
        .eq("id", event.id);
      if (error) return toast.error(error.message);
      toast.success("Evento cancelado para preservar o histórico.");
    } else {
      const { error } = await supabase.from("events").delete().eq("id", event.id);
      if (error) return toast.error(error.message);
      toast.success("Evento excluído.");
    }
    onChanged();
  }

  return (
    <SectionLayout
      eyebrow="Agenda do bar"
      title="Eventos"
      description="Trabalhe em rascunho, pré-visualize, publique e controle a operação sem apagar o histórico."
      action={
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Novo evento
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar evento ou atração" />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="draft">Rascunhos</option>
          <option value="published">Publicados</option>
          <option value="scheduled">Agendados antigos</option>
          <option value="ongoing">Rolando agora</option>
          <option value="ended">Encerrados</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyMessage>Nenhum evento encontrado.</EmptyMessage>
          </div>
        ) : (
          filtered.map((event) => {
            const busy = workingId === event.id;
            const checkinClosed = Boolean(
              event.checkin_closes_at && new Date(event.checkin_closes_at).getTime() <= Date.now(),
            );
            return (
              <article key={event.id} className="card-festa overflow-hidden">
                {event.image_url ? (
                  <img src={event.image_url} alt="" className="aspect-[16/7] w-full object-cover" />
                ) : (
                  <div className="grid-texture h-20 bg-electric" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {event.category}
                      </p>
                      <h3 className="mt-1 font-display text-2xl leading-tight">{event.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatDateTime(event.starts_at)}
                        {event.attraction ? ` · ${event.attraction}` : ""}
                      </p>
                    </div>
                    <StatusPill status={event.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-3 py-1.5 ${event.checkin_enabled && !checkinClosed ? "bg-primary/15 text-primary" : "bg-muted"}`}
                    >
                      Check-in{" "}
                      {event.checkin_enabled
                        ? checkinClosed
                          ? "encerrado"
                          : "ativo"
                        : "desativado"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1.5 ${event.chat_enabled ? "bg-samba text-white" : "bg-muted"}`}
                    >
                      Resenha {event.chat_enabled ? "ativa" : "desativada"}
                    </span>
                    {event.checkin_opens_at && (
                      <span className="rounded-full bg-muted px-3 py-1.5">
                        Abre {formatDateTime(event.checkin_opens_at)}
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewing(event)}>
                      <Eye className="h-4 w-4" /> Prévia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(event);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void duplicate(event)}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}{" "}
                      Duplicar
                    </Button>
                    {event.status === "draft" && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void updateStatus(event, "published")}
                      >
                        <Play className="h-4 w-4" /> Publicar
                      </Button>
                    )}
                    {["published", "scheduled"].includes(event.status) && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void updateStatus(event, "ongoing")}
                      >
                        <Play className="h-4 w-4" /> Começou
                      </Button>
                    )}
                    {event.status === "ongoing" && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void updateStatus(event, "ended")}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Encerrar evento
                      </Button>
                    )}
                    {event.checkin_enabled &&
                      !checkinClosed &&
                      !["ended", "cancelled"].includes(event.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void closeCheckin(event)}
                        >
                          <TimerOff className="h-4 w-4 text-brick" /> Fechar check-in
                        </Button>
                      )}
                    <Button variant="ghost" size="sm" onClick={() => void remove(event)}>
                      <Trash2 className="h-4 w-4 text-destructive" /> Excluir
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
      <EventDialog
        open={dialogOpen}
        event={editing}
        onOpenChange={setDialogOpen}
        onSaved={onChanged}
      />
      <EventPreviewDialog
        event={previewing}
        onOpenChange={(open) => !open && setPreviewing(null)}
      />
    </SectionLayout>
  );
}

function EventDialog({
  open,
  event,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  event: EventRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [imageSelection, setImageSelection] = useState<File | null | undefined>(undefined);

  useEffect(() => {
    if (open) setImageSelection(undefined);
  }, [open, event]);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const name = textValue(form, "name");
    const startsAt = textValue(form, "starts_at");
    const endsAt = nullableIso(form, "ends_at");
    const checkinOpensAt = nullableIso(form, "checkin_opens_at");
    const checkinClosesAt = nullableIso(form, "checkin_closes_at");
    const chatOpensAt = nullableIso(form, "chat_opens_at");
    const chatClosesAt = nullableIso(form, "chat_closes_at");

    if (endsAt && new Date(endsAt) <= new Date(toIso(startsAt)))
      return toast.error("O fim do evento precisa ser depois do início.");
    if (checkinOpensAt && checkinClosesAt && new Date(checkinClosesAt) <= new Date(checkinOpensAt))
      return toast.error("O encerramento do check-in precisa ser depois da abertura.");
    if (chatOpensAt && chatClosesAt && new Date(chatClosesAt) <= new Date(chatOpensAt))
      return toast.error("O encerramento da Resenha precisa ser depois da abertura.");

    setSaving(true);
    const slug = textValue(form, "slug") || slugify(name);
    const previousImageUrl = event?.image_url ?? null;
    let imageUrl = previousImageUrl;
    let uploadedImageUrl: string | null = null;

    try {
      if (imageSelection instanceof File) {
        const uploaded = await uploadPublicImage({
          bucket: "event-images",
          folder: "events",
          file: imageSelection,
        });
        imageUrl = uploaded.url;
        uploadedImageUrl = uploaded.url;
      } else if (imageSelection === null) imageUrl = null;

      const payload: EventInsert = {
        name,
        slug,
        category: textValue(form, "category"),
        description: nullableText(form, "description"),
        attraction: nullableText(form, "attraction"),
        image_url: imageUrl,
        starts_at: toIso(startsAt),
        ends_at: endsAt,
        checkin_opens_at: checkinOpensAt,
        checkin_closes_at: checkinClosesAt,
        checkin_enabled: form.get("checkin_enabled") === "on",
        chat_opens_at: chatOpensAt,
        chat_closes_at: chatClosesAt,
        chat_enabled: form.get("chat_enabled") === "on",
        status: textValue(form, "status"),
        instructions: nullableText(form, "instructions"),
      };
      const result = event
        ? await supabase.from("events").update(payload).eq("id", event.id)
        : await supabase.from("events").insert(payload);
      if (result.error) {
        if (uploadedImageUrl) await removePublicImage("event-images", uploadedImageUrl);
        throw result.error;
      }
      if (previousImageUrl && previousImageUrl !== imageUrl)
        await removePublicImage("event-images", previousImageUrl);
      toast.success(
        event
          ? "Evento atualizado."
          : payload.status === "draft"
            ? "Rascunho criado."
            : "Evento criado.",
      );
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o evento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {event ? "Editar evento" : "Novo evento"}
          </DialogTitle>
          <DialogDescription>
            Salve como rascunho para revisar antes de aparecer para os clientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <ImageUploadField
            key={`${event?.id ?? "new"}-${open ? "open" : "closed"}`}
            id="event-image"
            label="Imagem do evento"
            currentUrl={event?.image_url}
            onChange={setImageSelection}
            description="Escolha uma foto horizontal do computador ou celular."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do evento" name="name" defaultValue={event?.name} required />
            <Field
              label="Slug"
              name="slug"
              defaultValue={event?.slug}
              placeholder="gerado-automaticamente"
            />
            <Field
              label="Categoria"
              name="category"
              defaultValue={event?.category ?? "Pagode"}
              required
            />
            <Field label="Atração" name="attraction" defaultValue={event?.attraction} />
            <Field
              label="Início"
              name="starts_at"
              type="datetime-local"
              defaultValue={toLocalInput(event?.starts_at)}
              required
            />
            <Field
              label="Fim"
              name="ends_at"
              type="datetime-local"
              defaultValue={toLocalInput(event?.ends_at)}
            />
            <Field
              label="Abertura do check-in"
              name="checkin_opens_at"
              type="datetime-local"
              defaultValue={toLocalInput(event?.checkin_opens_at)}
            />
            <Field
              label="Encerramento do check-in"
              name="checkin_closes_at"
              type="datetime-local"
              defaultValue={toLocalInput(event?.checkin_closes_at)}
            />
            <Field
              label="Abertura da Resenha"
              name="chat_opens_at"
              type="datetime-local"
              defaultValue={toLocalInput(event?.chat_opens_at)}
            />
            <Field
              label="Encerramento da Resenha"
              name="chat_closes_at"
              type="datetime-local"
              defaultValue={toLocalInput(event?.chat_closes_at)}
            />
            <div className="space-y-2">
              <Label htmlFor="event-status">Status</Label>
              <select
                id="event-status"
                name="status"
                defaultValue={
                  event?.status === "scheduled" ? "published" : (event?.status ?? "draft")
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="ongoing">Rolando agora</option>
                <option value="ended">Encerrado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
          <TextField label="Descrição" name="description" defaultValue={event?.description} />
          <TextField label="Instruções" name="instructions" defaultValue={event?.instructions} />
          <label className="flex items-center justify-between rounded-2xl bg-muted p-4">
            <div>
              <p className="font-bold">Check-in habilitado</p>
              <p className="text-xs text-muted-foreground">
                Permite gerar e validar código neste evento.
              </p>
            </div>
            <Switch name="checkin_enabled" defaultChecked={event?.checkin_enabled ?? true} />
          </label>
          <label className="flex items-center justify-between rounded-2xl border-2 border-samba/25 bg-samba/10 p-4">
            <div className="pr-4">
              <p className="flex items-center gap-2 font-bold">
                <MessageCircleMore className="h-4 w-4 text-samba" /> Resenha do evento
              </p>
              <p className="text-xs text-muted-foreground">Só participa quem fez check-in.</p>
            </div>
            <Switch name="chat_enabled" defaultChecked={event?.chat_enabled ?? false} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Salvando…" : "Salvar evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventPreviewDialog({
  event,
  onOpenChange,
}: {
  event: EventRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(event)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-[30px] border-[3px] border-foreground p-0">
        {event && (
          <>
            {event.image_url ? (
              <img src={event.image_url} alt="" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div className="grid-texture h-40 bg-electric" />
            )}
            <div className="p-6">
              <span className="cut-label bg-mango">{event.category}</span>
              <h2 className="mt-5 font-display text-4xl leading-none">{event.name}</h2>
              {event.attraction && (
                <p className="mt-2 font-black text-primary">{event.attraction}</p>
              )}
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                {formatDateTime(event.starts_at)}
              </p>
              {event.description && (
                <p className="mt-4 text-sm leading-relaxed">{event.description}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-muted px-3 py-1.5">
                  Check-in {event.checkin_enabled ? "sim" : "não"}
                </span>
                <span className="rounded-full bg-muted px-3 py-1.5">
                  Resenha {event.chat_enabled ? "sim" : "não"}
                </span>
              </div>
              <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
                Fechar prévia
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CampaignsManager({
  campaigns,
  events,
  rewards,
  redemptions,
  profiles,
  onChanged,
}: {
  campaigns: CampaignRow[];
  events: EventRow[];
  rewards: RewardRow[];
  redemptions: RedemptionRow[];
  profiles: ProfileRow[];
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [previewing, setPreviewing] = useState<CampaignRow | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const rewardById = useMemo(
    () => new Map(rewards.map((reward) => [reward.id, reward])),
    [rewards],
  );
  const redeemedRewardIds = useMemo(
    () => new Set(redemptions.map((item) => item.reward_id)),
    [redemptions],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  function metrics(campaignId: string) {
    const rows = rewards.filter((reward) => reward.campaign_id === campaignId);
    const redeemed = rows.filter(
      (reward) => reward.status === "redeemed" || redeemedRewardIds.has(reward.id),
    ).length;
    const expired = rows.filter(
      (reward) =>
        reward.status === "expired" ||
        (reward.status !== "redeemed" &&
          Boolean(reward.expires_at) &&
          new Date(reward.expires_at!).getTime() <= now),
    ).length;
    const available = rows.filter(
      (reward) =>
        reward.status === "available" &&
        !redeemedRewardIds.has(reward.id) &&
        (!reward.expires_at || new Date(reward.expires_at).getTime() > now),
    ).length;
    return { granted: rows.length, redeemed, expired, available };
  }

  async function setStatus(campaign: CampaignRow, status: string) {
    setWorkingId(campaign.id);
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaign.id);
    setWorkingId(null);
    if (error) return toast.error(error.message);
    toast.success(
      status === "paused"
        ? "Campanha pausada."
        : status === "active"
          ? "Campanha ativada."
          : "Campanha encerrada.",
    );
    onChanged();
  }

  async function remove(campaign: CampaignRow) {
    if (!window.confirm(`Remover a campanha “${campaign.name}”?`)) return;
    const count = rewards.filter((reward) => reward.campaign_id === campaign.id).length;
    if (count > 0) {
      await setStatus(campaign, "ended");
      return;
    }
    const { error } = await supabase.from("campaigns").delete().eq("id", campaign.id);
    if (error) return toast.error(error.message);
    toast.success("Campanha excluída.");
    onChanged();
  }

  const latestRedemptions = [...redemptions]
    .sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime())
    .slice(0, 10);

  return (
    <SectionLayout
      eyebrow="Mimos e promoções"
      title="Campanhas"
      description="Crie o benefício, acompanhe o uso e pause a campanha sem apagar o histórico."
      action={
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nova campanha
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyMessage>Nenhuma campanha criada.</EmptyMessage>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const event = campaign.event_id ? eventById.get(campaign.event_id) : null;
            const counts = metrics(campaign.id);
            const remaining =
              campaign.total_available === null
                ? null
                : Math.max(0, campaign.total_available - counts.granted);
            const busy = workingId === campaign.id;
            const activeUntil = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;
            return (
              <article
                key={campaign.id}
                className="ticket-card checker-texture p-5 text-foreground"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
                      {event?.name ?? "Sem evento"}
                    </p>
                    <h3 className="mt-1 font-display text-3xl leading-none">{campaign.name}</h3>
                  </div>
                  <StatusPill status={campaign.status} />
                </div>
                <p className="mt-4 font-poster text-xl">{campaignBenefitLabel(campaign)}</p>
                {campaign.description && (
                  <p className="mt-2 text-sm font-semibold opacity-70">{campaign.description}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricMini label="Liberados" value={counts.granted} />
                  <MetricMini label="Disponíveis" value={counts.available} />
                  <MetricMini label="Utilizados" value={counts.redeemed} />
                  <MetricMini label="Expirados" value={counts.expired} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-white/75 px-3 py-1.5">
                    Validade: {formatRewardDuration(campaign.reward_valid_hours)}
                  </span>
                  <span className="rounded-full bg-white/75 px-3 py-1.5">
                    Por cliente: {campaign.per_user_limit}
                  </span>
                  {remaining !== null && (
                    <span
                      className={`rounded-full px-3 py-1.5 ${remaining === 0 ? "bg-destructive text-white" : "bg-white/75"}`}
                    >
                      Restam: {remaining}
                    </span>
                  )}
                  {campaign.status === "active" && activeUntil && activeUntil > now && (
                    <span className="rounded-full bg-foreground px-3 py-1.5 text-background">
                      Termina em {formatDuration(activeUntil - now)}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewing(campaign)}>
                    <Eye className="h-4 w-4" /> Prévia
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(campaign);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit3 className="h-4 w-4" /> Editar
                  </Button>
                  {campaign.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void setStatus(campaign, "paused")}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}{" "}
                      Pausar
                    </Button>
                  ) : campaign.status === "paused" ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void setStatus(campaign, "active")}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}{" "}
                      Ativar
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => void remove(campaign)}>
                    <Trash2 className="h-4 w-4 text-destructive" /> Excluir
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <section className="card-festa mt-6 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker text-muted-foreground">Operação</p>
            <h3 className="mt-1 font-display text-2xl">Últimos mimos utilizados</h3>
          </div>
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <div className="mt-4 divide-y divide-border">
          {latestRedemptions.length === 0 ? (
            <EmptyMessage>Nenhum mimo utilizado ainda.</EmptyMessage>
          ) : (
            latestRedemptions.map((redemption) => {
              const reward = rewardById.get(redemption.reward_id);
              const campaign = reward
                ? campaigns.find((item) => item.id === reward.campaign_id)
                : null;
              return (
                <div
                  key={redemption.id}
                  className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4"
                >
                  <p className="font-black">
                    {profileById.get(redemption.user_id)?.display_name ?? "Bafafã"}
                  </p>
                  <p className="text-muted-foreground">{campaign?.name ?? "Campanha"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(redemption.redeemed_at)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <CampaignDialog
        open={dialogOpen}
        campaign={editing}
        events={events}
        onOpenChange={setDialogOpen}
        onSaved={onChanged}
      />
      <CampaignPreviewDialog
        campaign={previewing}
        event={previewing?.event_id ? (eventById.get(previewing.event_id) ?? null) : null}
        onOpenChange={(open) => !open && setPreviewing(null)}
      />
    </SectionLayout>
  );
}

function CampaignDialog({
  open,
  campaign,
  events,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  campaign: CampaignRow | null;
  events: EventRow[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [benefitType, setBenefitType] = useState(campaign?.benefit_type ?? "percent_off");
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("hours");
  const [durationValue, setDurationValue] = useState("24");

  useEffect(() => {
    if (!open) return;
    setBenefitType(campaign?.benefit_type ?? "percent_off");
    const storedHours = Number(campaign?.reward_valid_hours ?? 24);
    const useMinutes = storedHours < 1 || !Number.isInteger(storedHours);
    setDurationUnit(useMinutes ? "minutes" : "hours");
    setDurationValue(String(useMinutes ? Math.round(storedHours * 60) : storedHours));
  }, [open, campaign]);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const startsAt = toIso(textValue(form, "starts_at"));
    const endsAt = nullableIso(form, "ends_at");
    if (endsAt && new Date(endsAt) <= new Date(startsAt))
      return toast.error("O fim da campanha precisa ser depois do início.");
    const totalAvailable = nullableNumber(form, "total_available");
    const perUser = numberValue(form, "per_user_limit", 1);
    if (totalAvailable !== null && perUser > totalAvailable)
      return toast.error("O limite por cliente não pode ser maior que o limite total.");

    setSaving(true);
    const payload: CampaignInsert = {
      event_id: nullableText(form, "event_id"),
      name: textValue(form, "name"),
      description: nullableText(form, "description"),
      benefit_type: textValue(form, "benefit_type"),
      discount_percent: nullableNumber(form, "discount_percent"),
      discount_max_cents: moneyToCents(form, "discount_max"),
      fixed_off_cents: moneyToCents(form, "fixed_off"),
      product_name: nullableText(form, "product_name"),
      instructions: nullableText(form, "instructions"),
      starts_at: startsAt,
      ends_at: endsAt,
      reward_valid_hours:
        durationUnit === "minutes"
          ? Math.max(Number(durationValue) || 1, 1) / 60
          : Math.max(Number(durationValue) || 1, 1),
      total_available: totalAvailable,
      per_user_limit: perUser,
      requires_checkin: form.get("requires_checkin") === "on",
      requires_min_profile: form.get("requires_min_profile") === "on",
      status: textValue(form, "status"),
      public_rules: nullableText(form, "public_rules"),
      internal_rules: nullableText(form, "internal_rules"),
    };
    const result = campaign
      ? await supabase.from("campaigns").update(payload).eq("id", campaign.id)
      : await supabase.from("campaigns").insert(payload);
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(campaign ? "Campanha atualizada." : "Campanha criada.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {campaign ? "Editar campanha" : "Nova campanha"}
          </DialogTitle>
          <DialogDescription>
            O mimo será liberado após um check-in válido e respeitará os limites abaixo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="campaign-event">Evento</Label>
              <select
                id="campaign-event"
                name="event_id"
                defaultValue={campaign?.event_id ?? events[0]?.id ?? ""}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Selecione</option>
                {events
                  .filter((event) => !["cancelled"].includes(event.status))
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} — {formatDateTime(event.starts_at)}
                    </option>
                  ))}
              </select>
            </div>
            <Field label="Nome da campanha" name="name" defaultValue={campaign?.name} required />
            <Field
              label="Produto participante"
              name="product_name"
              defaultValue={campaign?.product_name}
            />
            <div className="space-y-2">
              <Label htmlFor="benefit-type">Tipo de mimo</Label>
              <select
                id="benefit-type"
                name="benefit_type"
                value={benefitType}
                onChange={(event) => setBenefitType(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percent_off">Desconto percentual</option>
                <option value="fixed_off">Desconto em reais</option>
                <option value="freebie">Produto cortesia</option>
                <option value="bogo">Compre um e leve outro</option>
                <option value="custom">Benefício personalizado</option>
              </select>
            </div>
            {benefitType === "percent_off" && (
              <Field
                label="Desconto (%)"
                name="discount_percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={campaign?.discount_percent}
                required
              />
            )}
            {benefitType === "fixed_off" && (
              <Field
                label="Desconto (R$)"
                name="fixed_off"
                type="number"
                min="0"
                step="0.01"
                defaultValue={centsToMoney(campaign?.fixed_off_cents)}
                required
              />
            )}
            <Field
              label="Desconto máximo (R$)"
              name="discount_max"
              type="number"
              min="0"
              step="0.01"
              defaultValue={centsToMoney(campaign?.discount_max_cents)}
            />
            <div className="space-y-2">
              <Label htmlFor="reward-valid-value">Validade após liberar</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  id="reward-valid-value"
                  type="number"
                  min="1"
                  step="1"
                  value={durationValue}
                  onChange={(event) => setDurationValue(event.target.value)}
                  required
                />
                <select
                  aria-label="Unidade da validade"
                  value={durationUnit}
                  onChange={(event) => setDurationUnit(event.target.value as "minutes" | "hours")}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="minutes">minutos</option>
                  <option value="hours">horas</option>
                </select>
              </div>
            </div>
            <Field
              label="Limite total"
              name="total_available"
              type="number"
              min="1"
              defaultValue={campaign?.total_available}
              placeholder="Sem limite"
            />
            <Field
              label="Limite por cliente"
              name="per_user_limit"
              type="number"
              min="1"
              defaultValue={campaign?.per_user_limit ?? 1}
              required
            />
            <Field
              label="Início"
              name="starts_at"
              type="datetime-local"
              defaultValue={
                toLocalInput(campaign?.starts_at) || toLocalInput(new Date().toISOString())
              }
              required
            />
            <Field
              label="Fim"
              name="ends_at"
              type="datetime-local"
              defaultValue={toLocalInput(campaign?.ends_at)}
            />
            <div className="space-y-2">
              <Label htmlFor="campaign-status">Status</Label>
              <select
                id="campaign-status"
                name="status"
                defaultValue={campaign?.status ?? "active"}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">Ativa</option>
                <option value="paused">Pausada</option>
                <option value="ended">Encerrada</option>
              </select>
            </div>
          </div>
          <TextField label="Descrição" name="description" defaultValue={campaign?.description} />
          <TextField
            label="Regras para o cliente"
            name="public_rules"
            defaultValue={campaign?.public_rules}
          />
          <TextField
            label="Instruções para a equipe"
            name="instructions"
            defaultValue={campaign?.instructions}
          />
          <TextField
            label="Regras internas"
            name="internal_rules"
            defaultValue={campaign?.internal_rules}
          />
          <label className="flex items-center justify-between rounded-2xl bg-muted p-4">
            <div>
              <p className="font-bold">Exigir check-in</p>
              <p className="text-xs text-muted-foreground">
                Libera o mimo somente após presença validada.
              </p>
            </div>
            <Switch name="requires_checkin" defaultChecked={campaign?.requires_checkin ?? true} />
          </label>
          <label className="flex items-center justify-between rounded-2xl bg-muted p-4">
            <div>
              <p className="font-bold">Exigir perfil mínimo</p>
              <p className="text-xs text-muted-foreground">Exige pelo menos 40% do perfil.</p>
            </div>
            <Switch
              name="requires_min_profile"
              defaultChecked={campaign?.requires_min_profile ?? true}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Salvando…" : "Salvar campanha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CampaignPreviewDialog({
  campaign,
  event,
  onOpenChange,
}: {
  campaign: CampaignRow | null;
  event: EventRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(campaign)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[30px] border-[3px] border-foreground">
        {campaign && (
          <div className="ticket-card checker-texture p-5 text-foreground">
            <span className="cut-label bg-white">mimo do Bafafá</span>
            <h2 className="mt-5 font-display text-4xl leading-none">{campaign.name}</h2>
            <p className="mt-4 font-poster text-2xl">{campaignBenefitLabel(campaign)}</p>
            {campaign.description && (
              <p className="mt-2 text-sm font-semibold opacity-70">{campaign.description}</p>
            )}
            {event && <p className="mt-4 text-sm font-black">Rolê: {event.name}</p>}
            <p className="mt-2 text-xs font-bold opacity-70">
              Validade após liberar: {formatRewardDuration(campaign.reward_valid_hours)}
            </p>
            {campaign.public_rules && (
              <p className="mt-4 rounded-xl border-2 border-foreground/15 bg-white/70 p-3 text-xs font-semibold">
                {campaign.public_rules}
              </p>
            )}
            <Button className="mt-5 w-full" onClick={() => onOpenChange(false)}>
              Fechar prévia
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border-2 border-foreground/15 bg-white/70 p-2 text-center">
      <p className="font-display text-2xl leading-none">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.08em] opacity-65">{label}</p>
    </div>
  );
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

function ClientsManager({ data, onChanged }: { data: AdminData; onChanged: () => void }) {
  const [search, setSearch] = useState("");
  const [busyFounder, setBusyFounder] = useState<string | null>(null);
  const preferenceByUser = useMemo(
    () => new Map(data.preferences.map((preference) => [preference.user_id, preference])),
    [data.preferences],
  );
  const profileCompletionByUser = useMemo(
    () => new Map(data.profileCompletions.map((row) => [row.user_id, Number(row.percentage ?? 0)])),
    [data.profileCompletions],
  );
  const checkinsByUser = useMemo(
    () => countBy(data.checkins, (checkin) => checkin.user_id),
    [data.checkins],
  );
  const rewardsByUser = useMemo(
    () => countBy(data.rewards, (reward) => reward.user_id),
    [data.rewards],
  );
  const rolesByUser = useMemo(() => groupRoles(data.roles), [data.roles]);
  const founderBadge = data.badgeDefinitions.find((badge) => badge.slug === "bafafa-fundador");
  const founderUserIds = useMemo(
    () =>
      new Set(
        data.userBadges
          .filter((badge) => badge.badge_id === founderBadge?.id)
          .map((badge) => badge.user_id),
      ),
    [data.userBadges, founderBadge?.id],
  );

  const clients = data.profiles.filter((profile) =>
    `${profile.display_name} ${profile.username ?? ""} ${profile.city ?? ""} ${profile.neighborhood ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function toggleFounder(userId: string) {
    const enabled = !founderUserIds.has(userId);
    setBusyFounder(userId);
    const { error } = await supabase.rpc("admin_set_manual_badge", {
      _user_id: userId,
      _badge_slug: "bafafa-fundador",
      _enabled: enabled,
    });
    setBusyFounder(null);
    if (error) return toast.error(error.message);
    toast.success(enabled ? "Selo Sócio Fundador concedido." : "Selo Sócio Fundador removido.");
    onChanged();
  }

  return (
    <SectionLayout
      eyebrow="CRM inicial"
      title="Clientes"
      description="Dados declarados, perfil, presença, benefícios e o selo especial atribuído somente pela administração."
    >
      <div className="mb-4 sticker-card checker-texture p-4 text-sm font-semibold text-foreground">
        <p className="flex items-center gap-2 font-poster text-lg">
          <Crown className="h-5 w-5" /> Sócio Fundador
        </p>
        <p className="mt-1 opacity-75">
          É um selo manual e especial. Os outros selos continuam sendo concedidos automaticamente
          pelas regras do app.
        </p>
      </div>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Buscar nome, usuário, cidade ou bairro"
      />
      <div className="mt-4 overflow-hidden rounded-3xl border-2 border-foreground/15 bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-foreground text-[10px] uppercase tracking-[0.14em] text-background">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Localização</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Check-ins</th>
                <th className="px-4 py-3">Mimos</th>
                <th className="px-4 py-3">Sócio Fundador</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((profile) => {
                const completeness = profileCompletionByUser.get(profile.id) ?? 0;
                const isFounder = founderUserIds.has(profile.id);
                return (
                  <tr key={profile.id} className="hover:bg-muted/40">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-foreground bg-primary font-display text-lg text-white">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (profile.display_name[0]?.toUpperCase() ?? "B")
                          )}
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 font-bold">
                            {profile.display_name}
                            {isFounder && (
                              <span
                                title="Sócio Fundador"
                                className="grid h-6 w-6 place-items-center rounded-full border-2 border-foreground bg-mango shadow-[1px_2px_0_var(--foreground)]"
                              >
                                <Crown className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {profile.username ? `@${profile.username}` : "Sem usuário"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {[profile.city, profile.neighborhood].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold">{completeness}%</span>
                      <div className="mt-1 h-2 w-24 overflow-hidden rounded-full border border-foreground/20 bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${completeness}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-4 font-display text-2xl">
                      {checkinsByUser.get(profile.id) ?? 0}
                    </td>
                    <td className="px-4 py-4 font-display text-2xl">
                      {rewardsByUser.get(profile.id) ?? 0}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={busyFounder === profile.id || !founderBadge}
                        onClick={() => void toggleFounder(profile.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground px-3 py-2 text-xs font-black shadow-[2px_3px_0_var(--foreground)] disabled:opacity-50 ${
                          isFounder
                            ? "bg-mango text-foreground"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        {busyFounder === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crown className="h-4 w-4" />
                        )}
                        {isFounder ? "Concedido" : "Conceder"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(rolesByUser.get(profile.id) ?? ["gratuito"]).map((role) => (
                          <span
                            key={role}
                            className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {formatDateTime(profile.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {clients.length === 0 && <EmptyMessage>Nenhum cliente encontrado.</EmptyMessage>}
      </div>
    </SectionLayout>
  );
}

function CheckinsManager({ data }: { data: AdminData }) {
  const eventById = useMemo(
    () => new Map(data.events.map((event) => [event.id, event])),
    [data.events],
  );
  const profileById = useMemo(
    () => new Map(data.profiles.map((profile) => [profile.id, profile])),
    [data.profiles],
  );
  const [eventFilter, setEventFilter] = useState("all");

  const filtered = data.checkins.filter(
    (checkin) => eventFilter === "all" || checkin.event_id === eventFilter,
  );

  return (
    <SectionLayout
      eyebrow="Presenças confirmadas"
      title="Check-ins"
      description="Acompanhe quem entrou em cada evento e quem realizou a validação."
      action={
        <Link
          to="/staff/checkin"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <ShieldCheck className="h-4 w-4" /> Abrir validador
        </Link>
      }
    >
      <div className="mb-4 max-w-sm space-y-2">
        <Label htmlFor="checkin-event-filter">Filtrar por evento</Label>
        <select
          id="checkin-event-filter"
          value={eventFilter}
          onChange={(event) => setEventFilter(event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos os eventos</option>
          {data.events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-3xl border border-input bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Validado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((checkin) => (
                <tr key={checkin.id}>
                  <td className="px-4 py-4 font-bold">
                    {profileById.get(checkin.user_id)?.display_name || "Bafafã"}
                  </td>
                  <td className="px-4 py-4">
                    {eventById.get(checkin.event_id)?.name || "Evento removido"}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDateTime(checkin.created_at)}
                  </td>
                  <td className="px-4 py-4">{checkin.method}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {checkin.staff_id
                      ? profileById.get(checkin.staff_id)?.display_name || "Equipe"
                      : "Sistema"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyMessage>Nenhum check-in registrado.</EmptyMessage>}
      </div>
    </SectionLayout>
  );
}

function ChatModerationManager({ data, onChanged }: { data: AdminData; onChanged: () => void }) {
  const profileById = useMemo(
    () => new Map(data.profiles.map((profile) => [profile.id, profile])),
    [data.profiles],
  );
  const eventById = useMemo(
    () => new Map(data.events.map((event) => [event.id, event])),
    [data.events],
  );
  const messageById = useMemo(
    () => new Map(data.chatMessages.map((message) => [message.id, message])),
    [data.chatMessages],
  );
  const openReports = data.chatReports.filter((report) => report.status === "open");

  async function moderate(messageId: string, restore: boolean, reason?: string) {
    const { error } = await supabase.rpc("moderate_event_chat_message", {
      _message_id: messageId,
      _restore: restore,
      _reason: reason ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success(restore ? "Mensagem restaurada." : "Mensagem ocultada da Resenha.");
    onChanged();
  }

  return (
    <SectionLayout
      eyebrow="Conversa durante o evento"
      title="Resenha"
      description="Acompanhe denúncias e modere mensagens. O chat só abre para pessoas com check-in válido."
    >
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="card-festa p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker text-muted-foreground">Fila de moderação</p>
              <h3 className="mt-1 font-display text-2xl">Denúncias abertas</h3>
            </div>
            <span className="cut-label bg-secondary">{openReports.length}</span>
          </div>
          <div className="mt-5 space-y-3">
            {openReports.length === 0 ? (
              <EmptyMessage>Nenhuma denúncia aguardando análise.</EmptyMessage>
            ) : (
              openReports.map((report) => {
                const message = messageById.get(report.message_id);
                const author = message ? profileById.get(message.user_id) : null;
                const reporter = profileById.get(report.reporter_id);
                const event = message ? eventById.get(message.event_id) : null;
                return (
                  <article
                    key={report.id}
                    className="rounded-2xl border-2 border-foreground/15 bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{event?.name ?? "Evento"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Autor: {author?.display_name ?? "Usuário"} · denúncia de{" "}
                          {reporter?.display_name ?? "Bafafã"}
                        </p>
                      </div>
                      <StatusPill status={report.reason} />
                    </div>
                    <blockquote className="mt-3 rounded-xl bg-muted p-3 text-sm font-semibold">
                      {message?.body ?? "Mensagem não disponível."}
                    </blockquote>
                    {report.details && (
                      <p className="mt-2 text-xs text-muted-foreground">{report.details}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void moderate(report.message_id, false, report.reason)}
                      >
                        Ocultar mensagem
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void moderate(report.message_id, true)}
                      >
                        Manter e encerrar
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="card-festa p-5">
          <p className="section-kicker text-muted-foreground">Últimas mensagens</p>
          <h3 className="mt-1 font-display text-2xl">Visão rápida</h3>
          <div className="mt-5 space-y-3">
            {data.chatMessages.slice(0, 30).map((message) => (
              <article key={message.id} className="rounded-2xl border border-input p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">
                      {profileById.get(message.user_id)?.display_name ?? "Bafafã"} ·{" "}
                      {eventById.get(message.event_id)?.name ?? "Evento"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {message.body}
                    </p>
                  </div>
                  <StatusPill status={message.status} />
                </div>
                <div className="mt-3 flex gap-2">
                  {message.status === "visible" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void moderate(message.id, false, "Ação administrativa")}
                    >
                      Ocultar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void moderate(message.id, true)}
                    >
                      Restaurar
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {data.chatMessages.length === 0 && (
              <EmptyMessage>A Resenha ainda não recebeu mensagens.</EmptyMessage>
            )}
          </div>
        </section>
      </div>
    </SectionLayout>
  );
}

function TeamManager({
  profiles,
  roles,
  currentUserId,
  onChanged,
}: {
  profiles: ProfileRow[];
  roles: RoleRow[];
  currentUserId: string;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const rolesByUser = useMemo(() => groupRoles(roles), [roles]);

  const filtered = profiles.filter((profile) =>
    `${profile.display_name} ${profile.username ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function toggleRole(userId: string, role: "equipe" | "admin") {
    setBusyUser(`${userId}:${role}`);
    const hasCurrentRole = rolesByUser.get(userId)?.includes(role) ?? false;
    const result = hasCurrentRole
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: userId, role });
    setBusyUser(null);
    if (result.error) return toast.error(result.error.message);
    toast.success(hasCurrentRole ? "Acesso removido." : "Acesso concedido.");
    onChanged();
  }

  return (
    <SectionLayout
      eyebrow="Permissões"
      title="Equipe"
      description="Funcionários validam check-ins e mimos. Administradores gerenciam todo o sistema."
    >
      <div className="mb-4 rounded-2xl bg-mango/45 p-4 text-sm">
        A pessoa precisa criar uma conta normal antes de receber acesso de equipe.
      </div>
      <SearchField value={search} onChange={setSearch} placeholder="Buscar pessoa cadastrada" />
      <div className="mt-4 grid gap-3">
        {filtered.map((profile) => {
          const userRoles = rolesByUser.get(profile.id) ?? [];
          const isSelf = profile.id === currentUserId;
          return (
            <div
              key={profile.id}
              className="card-festa flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">{profile.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.username ? `@${profile.username}` : "Sem nome de usuário"}
                  {isSelf ? " · sua conta" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <RoleButton
                  active={userRoles.includes("equipe")}
                  loading={busyUser === `${profile.id}:equipe`}
                  onClick={() => void toggleRole(profile.id, "equipe")}
                >
                  Equipe
                </RoleButton>
                <RoleButton
                  active={userRoles.includes("admin")}
                  loading={busyUser === `${profile.id}:admin`}
                  disabled={isSelf && userRoles.includes("admin")}
                  onClick={() => void toggleRole(profile.id, "admin")}
                >
                  Administrador
                </RoleButton>
              </div>
            </div>
          );
        })}
      </div>
    </SectionLayout>
  );
}

function AuditManager({ data }: { data: AdminData }) {
  const profileById = useMemo(
    () => new Map(data.profiles.map((profile) => [profile.id, profile])),
    [data.profiles],
  );
  return (
    <SectionLayout
      eyebrow="Histórico de segurança"
      title="Auditoria"
      description="Registro das principais alterações administrativas e validações operacionais."
    >
      <div className="overflow-hidden rounded-3xl border border-input bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-muted text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Pessoa</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.audits.map((audit) => (
                <tr key={audit.id}>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDateTime(audit.created_at)}
                  </td>
                  <td className="px-4 py-4 font-bold">
                    {audit.actor_id
                      ? profileById.get(audit.actor_id)?.display_name || "Equipe"
                      : "Sistema"}
                  </td>
                  <td className="px-4 py-4">{audit.action}</td>
                  <td className="px-4 py-4 text-muted-foreground">{audit.entity || "—"}</td>
                  <td className="max-w-48 truncate px-4 py-4 font-mono text-xs text-muted-foreground">
                    {audit.entity_id || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.audits.length === 0 && (
          <EmptyMessage>A auditoria começa após a primeira alteração.</EmptyMessage>
        )}
      </div>
    </SectionLayout>
  );
}

function SectionLayout({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-lg">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  ...props
}: { label: string; name: string; defaultValue?: string | number | null } & Omit<
  ComponentProps<typeof Input>,
  "name" | "defaultValue"
>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} {...props} />
    </div>
  );
}

function TextField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue ?? ""} rows={3} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label: Record<string, string> = {
    draft: "Rascunho",
    published: "Publicado",
    scheduled: "Agendado",
    ongoing: "Rolando",
    ended: "Encerrado",
    cancelled: "Cancelado",
    active: "Ativa",
    paused: "Pausada",
  };
  return (
    <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em]">
      {label[status] || status}
    </span>
  );
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-input p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function RoleButton({
  active,
  loading,
  disabled,
  children,
  onClick,
}: {
  active: boolean;
  loading: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      disabled={loading || disabled}
      onClick={onClick}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {children}
    </Button>
  );
}

function textValue(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function nullableText(form: FormData, key: string) {
  const value = textValue(form, key);
  return value || null;
}

function numberValue(form: FormData, key: string, fallback = 0) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function nullableNumber(form: FormData, key: string) {
  const raw = textValue(form, key);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function moneyToCents(form: FormData, key: string) {
  const value = nullableNumber(form, key);
  return value === null ? null : Math.round(value * 100);
}

function centsToMoney(value: number | null | undefined) {
  return value === null || value === undefined ? "" : (value / 100).toFixed(2);
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function nullableIso(form: FormData, key: string) {
  const value = textValue(form, key);
  return value ? toIso(value) : null;
}

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatRewardDuration(hours: number) {
  const totalMinutes = Math.max(1, Math.round(Number(hours) * 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  if (totalMinutes % 60 === 0) {
    const wholeHours = totalMinutes / 60;
    return `${wholeHours} ${wholeHours === 1 ? "hora" : "horas"}`;
  }
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}h ${minutes}min`;
}

function groupRoles(roles: RoleRow[]) {
  const grouped = new Map<string, string[]>();
  roles.forEach((role) =>
    grouped.set(role.user_id, [...(grouped.get(role.user_id) ?? []), role.role]),
  );
  return grouped;
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
  return counts;
}
