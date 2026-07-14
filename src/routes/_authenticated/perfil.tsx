import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type HTMLInputTypeAttribute } from "react";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  Eye,
  LockKeyhole,
  LogOut,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";
import {
  BadgeSticker,
  NameWithBadges,
  type BafafaBadgeDefinition,
} from "@/components/profile/bafafa-badge";
import {
  EMPTY_PROFILE_COMPLETION,
  nextProfileTask,
  parseProfileCompletion,
  type ProfileCompletionDetails,
} from "@/lib/profile-completion";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Perfil,
});

type ProfileRow = {
  avatar_url: string | null;
  display_name: string;
  username: string | null;
  city: string | null;
  neighborhood: string | null;
  bio: string | null;
  how_found_us: string | null;
  birth_date: string | null;
  whatsapp: string | null;
  phone_verified_at: string | null;
  is_public: boolean;
  member_since: string;
  active_title_id: string | null;
};

type PreferencesRow = {
  event_categories: string[];
  drink_preferences: string[];
  food_preferences: string[];
  marketing_opt_in: boolean;
  notify_in_app: boolean;
  notify_email: boolean;
  notify_whatsapp: boolean;
};

type BadgeRow = {
  id: string;
  is_featured: boolean;
  is_hidden: boolean;
  awarded_at: string;
  badge_definitions: BafafaBadgeDefinition | null;
};

type TitleRow = {
  title_id: string;
  title_definitions: { name: string; description: string | null } | null;
};

const EVENT_OPTIONS = [
  "Pagode de sexta",
  "Pagode de sábado",
  "Feijoada",
  "Futebol",
  "Karaokê",
  "Eventos especiais",
];
const DRINK_OPTIONS = ["Cerveja", "Drinks", "Caipirinha", "Sem álcool"];
const FOOD_OPTIONS = ["Espetinhos", "Feijoada", "Petiscos", "Hambúrguer"];

const emptyPrefs: PreferencesRow = {
  event_categories: [],
  drink_preferences: [],
  food_preferences: [],
  marketing_opt_in: false,
  notify_in_app: true,
  notify_email: false,
  notify_whatsapp: false,
};

function Perfil() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [prefs, setPrefs] = useState<PreferencesRow>(emptyPrefs);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [completionDetails, setCompletionDetails] =
    useState<ProfileCompletionDetails>(EMPTY_PROFILE_COMPLETION);
  const [checkins, setCheckins] = useState(0);
  const [saving, setSaving] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<File | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([
      supabase
        .from("profiles")
        .select(
          "avatar_url,display_name,username,city,neighborhood,bio,how_found_us,birth_date,whatsapp,phone_verified_at,is_public,member_since,active_title_id",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_preferences")
        .select(
          "event_categories,drink_preferences,food_preferences,marketing_opt_in,notify_in_app,notify_email,notify_whatsapp",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_badges")
        .select("id,is_featured,is_hidden,awarded_at,badge_definitions(slug,name,description,icon)")
        .order("awarded_at", { ascending: false }),
      supabase
        .from("user_titles")
        .select("title_id,title_definitions(name,description)")
        .order("awarded_at", { ascending: false }),
      supabase.rpc("my_profile_completion_details"),
      supabase.from("checkins").select("id", { count: "exact", head: true }),
    ]).then(
      ([
        profileResult,
        prefsResult,
        badgesResult,
        titlesResult,
        completenessResult,
        checkinsResult,
      ]) => {
        if (!mounted) return;
        setProfile(profileResult.data as ProfileRow | null);
        setPrefs((prefsResult.data as PreferencesRow | null) ?? emptyPrefs);
        setBadges((badgesResult.data ?? []) as unknown as BadgeRow[]);
        setTitles((titlesResult.data ?? []) as unknown as TitleRow[]);
        setCompletionDetails(parseProfileCompletion(completenessResult.data));
        setCheckins(checkinsResult.count ?? 0);
      },
    );
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    const previousAvatarUrl = profile.avatar_url;
    let avatarUrl = previousAvatarUrl;
    let uploadedAvatarUrl: string | null = null;

    try {
      if (avatarSelection instanceof File) {
        const uploaded = await uploadPublicImage({
          bucket: "avatars",
          folder: user.id,
          file: avatarSelection,
        });
        avatarUrl = uploaded.url;
        uploadedAvatarUrl = uploaded.url;
      } else if (avatarSelection === null) {
        avatarUrl = null;
      }

      const [{ error: profileError }, { error: prefsError }] = await Promise.all([
        supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl,
            display_name: profile.display_name.trim(),
            username: profile.username?.trim() || null,
            city: profile.city?.trim() || null,
            neighborhood: profile.neighborhood?.trim() || null,
            bio: profile.bio?.trim() || null,
            how_found_us: profile.how_found_us?.trim() || null,
            birth_date: profile.birth_date || null,
            is_public: profile.is_public,
            active_title_id: profile.active_title_id,
          })
          .eq("id", user.id),
        supabase.from("user_preferences").upsert({ user_id: user.id, ...prefs }),
      ]);

      if (profileError || prefsError) {
        if (uploadedAvatarUrl) await removePublicImage("avatars", uploadedAvatarUrl);
        throw profileError ?? prefsError ?? new Error("Não foi possível salvar.");
      }

      if (previousAvatarUrl && previousAvatarUrl !== avatarUrl) {
        await removePublicImage("avatars", previousAvatarUrl);
      }

      setProfile({ ...profile, avatar_url: avatarUrl });
      setAvatarSelection(undefined);

      await supabase.from("user_consents").insert({
        user_id: user.id,
        kind: "marketing",
        accepted: prefs.marketing_opt_in,
        version: "1.0",
      });

      const [badgesResult, titlesResult, completenessResult] = await Promise.all([
        supabase
          .from("user_badges")
          .select(
            "id,is_featured,is_hidden,awarded_at,badge_definitions(slug,name,description,icon)",
          )
          .order("awarded_at", { ascending: false }),
        supabase
          .from("user_titles")
          .select("title_id,title_definitions(name,description)")
          .order("awarded_at", { ascending: false }),
        supabase.rpc("my_profile_completion_details"),
      ]);

      setBadges((badgesResult.data ?? []) as unknown as BadgeRow[]);
      setTitles((titlesResult.data ?? []) as unknown as TitleRow[]);
      setCompletionDetails(parseProfileCompletion(completenessResult.data));
      toast.success("Perfil salvinho.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function togglePreference(
    key: "event_categories" | "drink_preferences" | "food_preferences",
    value: string,
  ) {
    setPrefs((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  }

  const completeness = completionDetails.percentage;
  const nextTask = nextProfileTask(completionDetails);
  const canValidate = roles.some((role) => role === "admin" || role === "equipe");
  const isAdmin = roles.includes("admin");
  const initial = (profile?.display_name?.[0] ?? "B").toUpperCase();
  const activeTitle = titles.find((title) => title.title_id === profile?.active_title_id)
    ?.title_definitions?.name;
  const visibleBadgeDefinitions = badges
    .filter((badge) => !badge.is_hidden && badge.badge_definitions)
    .map((badge) => badge.badge_definitions as BafafaBadgeDefinition);
  const memberSince = profile?.member_since
    ? new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(
        new Date(profile.member_since),
      )
    : "agora";

  return (
    <AppShell>
      <ScreenHeader
        eyebrow="Sua carteirinha"
        title="Perfil"
        tone="brick"
        action={
          <button
            onClick={handleSignOut}
            aria-label="Sair"
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-foreground bg-background text-foreground shadow-[2px_3px_0_var(--foreground)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        }
      />

      <div className="space-y-5 px-5 pt-2">
        <section className="poster-card overflow-hidden bg-card">
          <div className="brick-texture h-24 border-b-[3px] border-foreground" />
          <div className="relative px-5 pb-5">
            <div className="-mt-12 flex items-end justify-between gap-4">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-[4px] border-foreground bg-primary font-display text-4xl text-primary-foreground shadow-[4px_5px_0_var(--foreground)]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`Foto de ${profile.display_name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              {profile?.username && profile.is_public && (
                <Link
                  to="/u/$username"
                  params={{ username: profile.username }}
                  className="mb-1 inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-mango px-3 py-2 text-xs font-black shadow-[2px_3px_0_var(--foreground)]"
                >
                  <Eye className="h-4 w-4" /> Perfil público
                </Link>
              )}
            </div>

            <div className="mt-4">
              <NameWithBadges
                name={profile?.display_name ?? "Bafafã"}
                badges={visibleBadgeDefinitions}
                className="font-poster text-2xl"
              />
              <p className="mt-0.5 text-sm font-bold text-muted-foreground">
                {profile?.username ? `@${profile.username}` : "Escolha seu @ no perfil"}
              </p>
              {activeTitle && (
                <span className="cut-label mt-3 bg-foreground text-background">{activeTitle}</span>
              )}
              {profile?.bio && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t-2 border-dashed border-foreground/25 pt-4 text-center">
              <div>
                <p className="font-display text-3xl leading-none">{checkins}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground">check-ins</p>
              </div>
              <div>
                <p className="font-display text-3xl leading-none">{badges.length}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground">selos</p>
              </div>
              <div>
                <p className="font-display text-xl leading-none">{memberSince}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground">no clube</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sticker-card checker-texture p-4 text-foreground">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="section-kicker">Aquisição de fofoca</p>
              <p className="mt-1 font-poster text-lg">Perfil {completeness}% completo</p>
            </div>
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-foreground bg-white">
            <div className="h-full bg-primary" style={{ width: `${completeness}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold opacity-70">
            {completeness === 100
              ? "Perfil no grau. O selo já sabe seu nome."
              : nextTask
                ? `Próxima fofoca: ${nextTask.label} (+${nextTask.weight}%).`
                : "Preencha aos poucos e desbloqueie selos e títulos."}
          </p>
          {completionDetails.items.length > 0 && (
            <div className="mt-4 grid gap-2 rounded-2xl border-2 border-foreground/15 bg-white/80 p-3 sm:grid-cols-2">
              {completionDetails.items.map((item) => (
                <div key={item.key} className="flex items-center gap-2 text-xs font-black">
                  {item.complete ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 opacity-35" />
                  )}
                  <span className={item.complete ? "" : "opacity-60"}>{item.label}</span>
                  <span className="ml-auto opacity-50">{item.weight}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {(canValidate || isAdmin) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {canValidate && (
              <Link
                to="/staff/checkin"
                className="sticker-card flex items-center gap-3 bg-primary p-4 text-primary-foreground"
              >
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="font-poster text-sm">Validar códigos</p>
                  <p className="text-xs opacity-75">Check-in e mimos.</p>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="sticker-card flex items-center gap-3 bg-foreground p-4 text-background"
              >
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="font-poster text-sm">Administração</p>
                  <p className="text-xs opacity-70">Gestão do aplicativo.</p>
                </div>
              </Link>
            )}
          </div>
        )}

        <section className="sticker-card bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-samba" />
              <h2 className="font-display text-2xl">Meus selos</h2>
            </div>
            <span className="cut-label bg-lagoa">{badges.length} na coleção</span>
          </div>
          {badges.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              Seu primeiro check-in libera o primeiro selo de presença.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
              {badges.map((badge) =>
                badge.badge_definitions ? (
                  <BadgeSticker key={badge.id} badge={badge.badge_definitions} />
                ) : null,
              )}
            </div>
          )}
        </section>

        <form onSubmit={saveProfile} className="sticker-card space-y-5 bg-card p-5">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            <div>
              <p className="section-kicker text-muted-foreground">Conta mais um pouco</p>
              <h2 className="font-display text-2xl">Completar perfil</h2>
            </div>
          </div>

          {!profile ? (
            <p className="text-sm text-muted-foreground">Carregando seu perfil…</p>
          ) : (
            <>
              <ImageUploadField
                id="profile-avatar"
                label="Foto do perfil"
                currentUrl={profile.avatar_url}
                onChange={setAvatarSelection}
                description="Escolha uma foto do computador ou celular. Ela será cortada em formato redondo."
                round
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nome"
                  value={profile.display_name}
                  onChange={(value) => setProfile({ ...profile, display_name: value })}
                  required
                />
                <TextField
                  label="Nome de usuário"
                  value={profile.username ?? ""}
                  onChange={(value) => setProfile({ ...profile, username: value })}
                  placeholder="seuusuario"
                />
                <TextField
                  label="Data de nascimento"
                  value={profile.birth_date ?? ""}
                  onChange={(value) => setProfile({ ...profile, birth_date: value || null })}
                  type="date"
                />
                <TextField
                  label="Cidade"
                  value={profile.city ?? ""}
                  onChange={(value) => setProfile({ ...profile, city: value })}
                />
                <TextField
                  label="Bairro"
                  value={profile.neighborhood ?? ""}
                  onChange={(value) => setProfile({ ...profile, neighborhood: value })}
                />
              </div>
              <TextField
                label="Como conheceu o Bafafá?"
                value={profile.how_found_us ?? ""}
                onChange={(value) => setProfile({ ...profile, how_found_us: value })}
                placeholder="Amigos, Instagram, passando na praça…"
              />
              <label className="block">
                <span className="mb-1 block text-sm font-black">Bio curta</span>
                <textarea
                  value={profile.bio ?? ""}
                  onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                  rows={3}
                  className={inputCls}
                />
              </label>

              <PreferenceGroup
                title="Quais rolês você curte?"
                options={EVENT_OPTIONS}
                selected={prefs.event_categories}
                onToggle={(value) => togglePreference("event_categories", value)}
              />
              <PreferenceGroup
                title="O que costuma beber?"
                options={DRINK_OPTIONS}
                selected={prefs.drink_preferences}
                onToggle={(value) => togglePreference("drink_preferences", value)}
              />
              <PreferenceGroup
                title="E pra comer?"
                options={FOOD_OPTIONS}
                selected={prefs.food_preferences}
                onToggle={(value) => togglePreference("food_preferences", value)}
              />

              {titles.length > 0 && (
                <label className="block">
                  <span className="mb-1 flex items-center gap-2 text-sm font-black">
                    <Trophy className="h-4 w-4" /> Título em destaque
                  </span>
                  <select
                    value={profile.active_title_id ?? ""}
                    onChange={(event) =>
                      setProfile({ ...profile, active_title_id: event.target.value || null })
                    }
                    className={inputCls}
                  >
                    <option value="">Sem título</option>
                    {titles.map((title) => (
                      <option key={title.title_id} value={title.title_id}>
                        {title.title_definitions?.name ?? "Título"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="space-y-3 rounded-2xl border-2 border-foreground/15 bg-muted p-4 text-sm">
                <Toggle
                  label="Perfil visível para outros Bafafãs"
                  checked={profile.is_public}
                  onChange={(checked) => setProfile({ ...profile, is_public: checked })}
                />
                <Toggle
                  label="Receber avisos dentro do app"
                  checked={prefs.notify_in_app}
                  onChange={(checked) => setPrefs({ ...prefs, notify_in_app: checked })}
                />
                <Toggle
                  label="Receber promoções por WhatsApp/e-mail (opcional)"
                  checked={prefs.marketing_opt_in}
                  onChange={(checked) => setPrefs({ ...prefs, marketing_opt_in: checked })}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary py-3 text-sm font-black text-primary-foreground shadow-[3px_4px_0_var(--foreground)] disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar perfil"}
              </button>
            </>
          )}
        </form>

        <section className="card-festa p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-black text-foreground">
            <LockKeyhole className="h-4 w-4" /> Dados privados
          </p>
          <p className="mt-2">
            Telefone, nascimento, preferências, check-ins e histórico de mimos não aparecem no
            perfil público.
          </p>
          <p className="mt-2 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Cidade só aparece quando você autoriza no perfil.
          </p>
          <p className="mt-2 flex items-center gap-1.5">
            <CalendarCheck2 className="h-3.5 w-3.5" /> Telefone verificado:{" "}
            {profile?.phone_verified_at ? "sim" : "será ativado no lançamento com OTP"}.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-xl border-2 border-foreground/20 bg-surface px-4 py-2.5 font-semibold outline-none focus:border-electric focus:ring-4 focus:ring-lagoa/20";

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-black">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

function PreferenceGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-black">{title}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option, index) => {
          const active = selected.includes(option);
          const colors = [
            "bg-mango",
            "bg-lagoa",
            "bg-samba text-white",
            "bg-secondary",
            "bg-primary text-white",
          ];
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full border-2 px-3 py-2 text-xs font-black transition ${
                active
                  ? `${colors[index % colors.length]} border-foreground shadow-[2px_2px_0_var(--foreground)]`
                  : "border-foreground/15 bg-background text-muted-foreground"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}
