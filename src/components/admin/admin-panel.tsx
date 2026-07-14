import { useCallback, useEffect, useMemo, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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

export type AdminSection =
  | "overview"
  | "events"
  | "campaigns"
  | "clients"
  | "checkins"
  | "team"
  | "audit";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PreferenceRow = Database["public"]["Tables"]["user_preferences"]["Row"];
type CheckinRow = Database["public"]["Tables"]["checkins"]["Row"];
type RoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
type RewardRow = Database["public"]["Tables"]["user_rewards"]["Row"];
type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];

type AdminData = {
  events: EventRow[];
  campaigns: CampaignRow[];
  profiles: ProfileRow[];
  preferences: PreferenceRow[];
  checkins: CheckinRow[];
  roles: RoleRow[];
  rewards: RewardRow[];
  audits: AuditRow[];
};

const EMPTY_DATA: AdminData = {
  events: [],
  campaigns: [],
  profiles: [],
  preferences: [],
  checkins: [],
  roles: [],
  rewards: [],
  audits: [],
};

const NAV_ITEMS: Array<{ key: AdminSection; label: string; icon: typeof BarChart3 }> = [
  { key: "overview", label: "Visão geral", icon: BarChart3 },
  { key: "events", label: "Eventos", icon: CalendarDays },
  { key: "campaigns", label: "Campanhas", icon: Gift },
  { key: "clients", label: "Clientes", icon: Users },
  { key: "checkins", label: "Check-ins", icon: CheckCircle2 },
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

    const [events, campaigns, profiles, preferences, checkins, roles, rewards, audits] =
      await Promise.all([
        supabase.from("events").select("*").order("starts_at", { ascending: false }),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", {
          ascending: false,
        }),
        supabase.from("user_preferences").select("*"),
        supabase.from("checkins").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("user_roles").select("*"),
        supabase.from("user_rewards").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

    const firstError = [events, campaigns, profiles, preferences, checkins, roles, rewards, audits]
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
        audits: audits.data ?? [],
      });
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Wordmark variant="short" />
            <div className="hidden min-w-0 sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Painel administrativo
              </p>
              <p className="truncate font-display text-lg">Clube dos Bafafãs</p>
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
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                section === key
                  ? "bg-foreground text-background shadow-festa"
                  : "border border-input bg-card text-muted-foreground hover:bg-muted"
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
            {section === "events" && (
              <EventsManager events={data.events} onChanged={() => void loadData(true)} />
            )}
            {section === "campaigns" && (
              <CampaignsManager
                campaigns={data.campaigns}
                events={data.events}
                onChanged={() => void loadData(true)}
              />
            )}
            {section === "clients" && <ClientsManager data={data} />}
            {section === "checkins" && <CheckinsManager data={data} />}
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
          <div key={label} className="card-festa p-5">
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
              const count = data.profiles.filter((profile) =>
                profileCompleteness(
                  profile,
                  data.preferences.find((preference) => preference.user_id === profile.id),
                ) >= threshold,
              ).length;
              return (
                <div key={threshold} className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">{threshold === 100 ? "100% completos" : `${threshold}% ou mais`}</span>
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
  const [search, setSearch] = useState("");

  const filtered = events.filter((event) =>
    `${event.name} ${event.category} ${event.attraction ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function remove(event: EventRow) {
    if (!window.confirm(`Remover o evento “${event.name}” da agenda?`)) return;
    const [checkins, campaigns] = await Promise.all([
      supabase.from("checkins").select("id", { count: "exact", head: true }).eq("event_id", event.id),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    ]);
    if (checkins.error || campaigns.error) {
      return toast.error(checkins.error?.message ?? campaigns.error?.message ?? "Não foi possível verificar o evento.");
    }
    if ((checkins.count ?? 0) > 0 || (campaigns.count ?? 0) > 0) {
      const { error } = await supabase
        .from("events")
        .update({ status: "cancelled", checkin_enabled: false })
        .eq("id", event.id);
      if (error) return toast.error(error.message);
      toast.success("Evento arquivado para preservar o histórico.");
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
      description="Crie a agenda, defina a janela de check-in e publique o que aparece para os clientes."
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
      <SearchField value={search} onChange={setSearch} placeholder="Buscar evento ou atração" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyMessage>Nenhum evento encontrado.</EmptyMessage>
          </div>
        ) : (
          filtered.map((event) => (
            <article key={event.id} className="card-festa overflow-hidden">
              <div className="h-2 bg-primary" />
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
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    Check-in {event.checkin_enabled ? "ativo" : "desativado"}
                  </span>
                  {event.checkin_opens_at && (
                    <span className="rounded-full bg-muted px-3 py-1.5">
                      Abre {formatDateTime(event.checkin_opens_at)}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex gap-2">
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
                  <Button variant="ghost" size="sm" onClick={() => void remove(event)}>
                    <Trash2 className="h-4 w-4 text-destructive" /> Excluir
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      <EventDialog
        open={dialogOpen}
        event={editing}
        onOpenChange={setDialogOpen}
        onSaved={onChanged}
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

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    const form = new FormData(formEvent.currentTarget);
    const name = textValue(form, "name");
    const startsAt = textValue(form, "starts_at");
    const slug = textValue(form, "slug") || slugify(name);
    const checkinEnabled = form.get("checkin_enabled") === "on";

    const payload: EventInsert = {
      name,
      slug,
      category: textValue(form, "category"),
      description: nullableText(form, "description"),
      attraction: nullableText(form, "attraction"),
      image_url: nullableText(form, "image_url"),
      starts_at: toIso(startsAt),
      ends_at: nullableIso(form, "ends_at"),
      checkin_opens_at: nullableIso(form, "checkin_opens_at"),
      checkin_closes_at: nullableIso(form, "checkin_closes_at"),
      checkin_enabled: checkinEnabled,
      status: textValue(form, "status"),
      instructions: nullableText(form, "instructions"),
    };

    const result = event
      ? await supabase.from("events").update(payload).eq("id", event.id)
      : await supabase.from("events").insert(payload);
    setSaving(false);

    if (result.error) return toast.error(result.error.message);
    toast.success(event ? "Evento atualizado." : "Evento criado.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {event ? "Editar evento" : "Novo evento"}
          </DialogTitle>
          <DialogDescription>
            O evento publicado aparecerá na agenda dos clientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do evento" name="name" defaultValue={event?.name} required />
            <Field label="Slug" name="slug" defaultValue={event?.slug} placeholder="gerado-automaticamente" />
            <Field label="Categoria" name="category" defaultValue={event?.category ?? "Pagode"} required />
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
            <div className="space-y-2">
              <Label htmlFor="event-status">Status</Label>
              <select
                id="event-status"
                name="status"
                defaultValue={event?.status ?? "scheduled"}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">Rascunho</option>
                <option value="scheduled">Agendado</option>
                <option value="ongoing">Rolando agora</option>
                <option value="ended">Encerrado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <Field label="URL da imagem" name="image_url" defaultValue={event?.image_url} />
          </div>
          <TextField label="Descrição" name="description" defaultValue={event?.description} />
          <TextField label="Instruções" name="instructions" defaultValue={event?.instructions} />
          <label className="flex items-center justify-between rounded-2xl bg-muted p-4">
            <div>
              <p className="font-bold">Check-in habilitado</p>
              <p className="text-xs text-muted-foreground">Permite gerar código para este evento.</p>
            </div>
            <Switch name="checkin_enabled" defaultChecked={event?.checkin_enabled ?? true} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CampaignsManager({
  campaigns,
  events,
  onChanged,
}: {
  campaigns: CampaignRow[];
  events: EventRow[];
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  async function remove(campaign: CampaignRow) {
    if (!window.confirm(`Remover a campanha “${campaign.name}”?`)) return;
    const rewards = await supabase
      .from("user_rewards")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);
    if (rewards.error) return toast.error(rewards.error.message);
    if ((rewards.count ?? 0) > 0) {
      const { error } = await supabase.from("campaigns").update({ status: "ended" }).eq("id", campaign.id);
      if (error) return toast.error(error.message);
      toast.success("Campanha encerrada para preservar os mimos já liberados.");
    } else {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaign.id);
      if (error) return toast.error(error.message);
      toast.success("Campanha excluída.");
    }
    onChanged();
  }

  return (
    <SectionLayout
      eyebrow="Mimos e promoções"
      title="Campanhas"
      description="Vincule um benefício a um evento e defina as regras de liberação."
      action={
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          disabled={events.length === 0}
        >
          <Plus className="h-4 w-4" /> Nova campanha
        </Button>
      }
    >
      {events.length === 0 && (
        <div className="mb-4 rounded-2xl bg-mango/50 p-4 text-sm">
          Cadastre um evento antes de criar a primeira campanha.
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyMessage>Nenhuma campanha cadastrada.</EmptyMessage>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const event = campaign.event_id ? eventById.get(campaign.event_id) : null;
            return (
              <article key={campaign.id} className="card-festa p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {event?.name || "Campanha geral"}
                    </p>
                    <h3 className="mt-1 font-display text-2xl">{campaign.name}</h3>
                    <p className="mt-2 text-sm font-bold text-primary">
                      {campaignBenefitLabel(campaign)}
                    </p>
                  </div>
                  <StatusPill status={campaign.status} />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {campaign.description || campaign.public_rules || "Sem descrição pública."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    {campaign.per_user_limit} por cliente
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    Validade: {campaign.reward_valid_hours}h
                  </span>
                  {campaign.total_available !== null && (
                    <span className="rounded-full bg-muted px-3 py-1.5">
                      Limite: {campaign.total_available}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex gap-2">
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
                  <Button variant="ghost" size="sm" onClick={() => void remove(campaign)}>
                    <Trash2 className="h-4 w-4 text-destructive" /> Excluir
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>
      <CampaignDialog
        open={dialogOpen}
        campaign={editing}
        events={events}
        onOpenChange={setDialogOpen}
        onSaved={onChanged}
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

  useEffect(() => {
    if (open) setBenefitType(campaign?.benefit_type ?? "percent_off");
  }, [open, campaign]);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    const form = new FormData(formEvent.currentTarget);
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
      starts_at: toIso(textValue(form, "starts_at")),
      ends_at: nullableIso(form, "ends_at"),
      reward_valid_hours: numberValue(form, "reward_valid_hours", 24),
      total_available: nullableNumber(form, "total_available"),
      per_user_limit: numberValue(form, "per_user_limit", 1),
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
            O mimo será liberado automaticamente após um check-in válido.
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
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} — {formatDateTime(event.starts_at)}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Nome da campanha" name="name" defaultValue={campaign?.name} required />
            <Field label="Produto participante" name="product_name" defaultValue={campaign?.product_name} />
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
            <Field
              label="Validade após liberar (horas)"
              name="reward_valid_hours"
              type="number"
              min="1"
              defaultValue={campaign?.reward_valid_hours ?? 24}
              required
            />
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
              defaultValue={toLocalInput(campaign?.starts_at) || toLocalInput(new Date().toISOString())}
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
          <TextField label="Regras para o cliente" name="public_rules" defaultValue={campaign?.public_rules} />
          <TextField label="Instruções para a equipe" name="instructions" defaultValue={campaign?.instructions} />
          <TextField label="Regras internas" name="internal_rules" defaultValue={campaign?.internal_rules} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl bg-muted p-4">
              <div className="pr-3">
                <p className="font-bold">Exigir check-in</p>
                <p className="text-xs text-muted-foreground">Libera somente com presença validada.</p>
              </div>
              <Switch name="requires_checkin" defaultChecked={campaign?.requires_checkin ?? true} />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-muted p-4">
              <div className="pr-3">
                <p className="font-bold">Perfil mínimo</p>
                <p className="text-xs text-muted-foreground">Exige pelo menos 40% preenchido.</p>
              </div>
              <Switch
                name="requires_min_profile"
                defaultChecked={campaign?.requires_min_profile ?? true}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar campanha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientsManager({ data }: { data: AdminData }) {
  const [search, setSearch] = useState("");
  const preferenceByUser = useMemo(
    () => new Map(data.preferences.map((preference) => [preference.user_id, preference])),
    [data.preferences],
  );
  const checkinsByUser = useMemo(() => countBy(data.checkins, (checkin) => checkin.user_id), [data.checkins]);
  const rewardsByUser = useMemo(() => countBy(data.rewards, (reward) => reward.user_id), [data.rewards]);
  const rolesByUser = useMemo(() => groupRoles(data.roles), [data.roles]);

  const clients = data.profiles.filter((profile) =>
    `${profile.display_name} ${profile.username ?? ""} ${profile.city ?? ""} ${profile.neighborhood ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <SectionLayout
      eyebrow="CRM inicial"
      title="Clientes"
      description="Dados declarados, perfil, presença e benefícios. Sem exportação nesta fase."
    >
      <SearchField value={search} onChange={setSearch} placeholder="Buscar nome, usuário, cidade ou bairro" />
      <div className="mt-4 overflow-hidden rounded-3xl border border-input bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Localização</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Check-ins</th>
                <th className="px-4 py-3">Mimos</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((profile) => {
                const completeness = profileCompleteness(profile, preferenceByUser.get(profile.id));
                return (
                  <tr key={profile.id} className="hover:bg-muted/40">
                    <td className="px-4 py-4">
                      <p className="font-bold">{profile.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile.username ? `@${profile.username}` : "Sem usuário"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {[profile.city, profile.neighborhood].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold">{completeness}%</span>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${completeness}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-4 font-display text-lg">{checkinsByUser.get(profile.id) ?? 0}</td>
                    <td className="px-4 py-4 font-display text-lg">{rewardsByUser.get(profile.id) ?? 0}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(rolesByUser.get(profile.id) ?? ["gratuito"]).map((role) => (
                          <span key={role} className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">
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
  const eventById = useMemo(() => new Map(data.events.map((event) => [event.id, event])), [data.events]);
  const profileById = useMemo(() => new Map(data.profiles.map((profile) => [profile.id, profile])), [data.profiles]);
  const [eventFilter, setEventFilter] = useState("all");

  const filtered = data.checkins.filter((checkin) => eventFilter === "all" || checkin.event_id === eventFilter);

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
                  <td className="px-4 py-4">{eventById.get(checkin.event_id)?.name || "Evento removido"}</td>
                  <td className="px-4 py-4 text-muted-foreground">{formatDateTime(checkin.created_at)}</td>
                  <td className="px-4 py-4">{checkin.method}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {checkin.staff_id ? profileById.get(checkin.staff_id)?.display_name || "Equipe" : "Sistema"}
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
    `${profile.display_name} ${profile.username ?? ""}`.toLowerCase().includes(search.toLowerCase()),
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
            <div key={profile.id} className="card-festa flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
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
  const profileById = useMemo(() => new Map(data.profiles.map((profile) => [profile.id, profile])), [data.profiles]);
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
                  <td className="px-4 py-4 text-muted-foreground">{formatDateTime(audit.created_at)}</td>
                  <td className="px-4 py-4 font-bold">
                    {audit.actor_id ? profileById.get(audit.actor_id)?.display_name || "Equipe" : "Sistema"}
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
        {data.audits.length === 0 && <EmptyMessage>A auditoria começa após a primeira alteração.</EmptyMessage>}
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
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-lg">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Field({ label, name, defaultValue, ...props }: { label: string; name: string; defaultValue?: string | number | null } & Omit<ComponentProps<typeof Input>, "name" | "defaultValue">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} {...props} />
    </div>
  );
}

function TextField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
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
  return <div className="rounded-2xl border border-dashed border-input p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

function RoleButton({ active, loading, disabled, children, onClick }: { active: boolean; loading: boolean; disabled?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <Button type="button" variant={active ? "default" : "outline"} size="sm" disabled={loading || disabled} onClick={onClick}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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

function groupRoles(roles: RoleRow[]) {
  const grouped = new Map<string, string[]>();
  roles.forEach((role) => grouped.set(role.user_id, [...(grouped.get(role.user_id) ?? []), role.role]));
  return grouped;
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
  return counts;
}

function profileCompleteness(profile: ProfileRow, preferences?: PreferenceRow) {
  let total = 0;
  if (profile.phone_verified_at) total += 20;
  if (profile.display_name && profile.birth_date) total += 20;
  if (profile.city && profile.neighborhood) total += 15;
  if (preferences?.event_categories?.length) total += 15;
  if (preferences?.drink_preferences?.length || preferences?.food_preferences?.length) total += 15;
  if (profile.how_found_us) total += 10;
  if (profile.avatar_url || profile.bio) total += 5;
  return Math.min(total, 100);
}
