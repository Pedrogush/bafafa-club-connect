import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BadgeCheck, LogOut, Save, ShieldCheck, Trophy, UserRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";

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
  badge_definitions: { name: string; description: string; icon: string } | null;
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
  const [completeness, setCompleteness] = useState(0);
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
        .select("id,is_featured,is_hidden,awarded_at,badge_definitions(name,description,icon)")
        .order("awarded_at", { ascending: false }),
      supabase
        .from("user_titles")
        .select("title_id,title_definitions(name,description)")
        .order("awarded_at", { ascending: false }),
      supabase.rpc("my_profile_completeness"),
    ]).then(([profileResult, prefsResult, badgesResult, titlesResult, completenessResult]) => {
      if (!mounted) return;
      setProfile(profileResult.data as ProfileRow | null);
      setPrefs((prefsResult.data as PreferencesRow | null) ?? emptyPrefs);
      setBadges((badgesResult.data ?? []) as unknown as BadgeRow[]);
      setTitles((titlesResult.data ?? []) as unknown as TitleRow[]);
      setCompleteness(typeof completenessResult.data === "number" ? completenessResult.data : 0);
    });
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
          .select("id,is_featured,is_hidden,awarded_at,badge_definitions(name,description,icon)")
          .order("awarded_at", { ascending: false }),
        supabase
          .from("user_titles")
          .select("title_id,title_definitions(name,description)")
          .order("awarded_at", { ascending: false }),
        supabase.rpc("my_profile_completeness"),
      ]);

      setBadges((badgesResult.data ?? []) as unknown as BadgeRow[]);
      setTitles((titlesResult.data ?? []) as unknown as TitleRow[]);
      setCompleteness(
        typeof completenessResult.data === "number" ? completenessResult.data : completeness,
      );
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

  const canValidate = roles.some((role) => role === "admin" || role === "equipe");
  const isAdmin = roles.includes("admin");
  const initial = (profile?.display_name?.[0] ?? "B").toUpperCase();
  const activeTitle = titles.find((title) => title.title_id === profile?.active_title_id)
    ?.title_definitions?.name;

  return (
    <AppShell>
      <ScreenHeader
        eyebrow="Seu clube"
        title="Perfil"
        action={
          <button
            onClick={handleSignOut}
            aria-label="Sair"
            className="grid h-10 w-10 place-items-center rounded-full border border-input text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
          </button>
        }
      />

      <div className="space-y-4 px-5">
        <section className="card-festa p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-display text-2xl text-primary-foreground">
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
            <div className="min-w-0">
              <p className="truncate font-display text-xl">{profile?.display_name ?? "Bafafã"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {profile?.username ? `@${profile.username}` : "Escolha seu @ no perfil"}
              </p>
              {activeTitle && (
                <span className="mt-1 inline-flex rounded-full bg-mango px-2.5 py-1 text-[10px] font-bold uppercase text-mango-foreground">
                  {activeTitle}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-bold">Perfil {completeness}% completo</span>
            <span className="text-muted-foreground">{badges.length} selo(s)</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${completeness}%` }} />
          </div>
        </section>

        {(canValidate || isAdmin) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {canValidate && (
              <Link
                to="/staff/checkin"
                className="card-festa flex items-center gap-3 bg-primary p-4 text-primary-foreground"
              >
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="font-display text-sm">Validar códigos</p>
                  <p className="text-xs opacity-75">Check-in e mimos.</p>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="card-festa flex items-center gap-3 bg-foreground p-4 text-background"
              >
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="font-display text-sm">Administração</p>
                  <p className="text-xs opacity-70">Gestão do aplicativo.</p>
                </div>
              </Link>
            )}
          </div>
        )}

        <section className="card-festa p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-samba" />
            <h2 className="font-display text-lg">Meus selos</h2>
          </div>
          {badges.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Seu primeiro check-in libera o primeiro selo de presença.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {badges.map((badge) => (
                <div key={badge.id} className="rounded-2xl bg-muted p-3">
                  <p className="text-sm font-bold">{badge.badge_definitions?.name ?? "Selo"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {badge.badge_definitions?.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={saveProfile} className="card-festa space-y-5 p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg">Completar perfil</h2>
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
                <span className="mb-1 block text-sm font-semibold">Bio curta</span>
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
                  <span className="mb-1 flex items-center gap-2 text-sm font-semibold">
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

              <div className="space-y-3 rounded-2xl bg-muted p-4 text-sm">
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-festa disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar perfil"}
              </button>
            </>
          )}
        </form>

        <section className="card-festa p-4 text-sm text-muted-foreground">
          <p className="font-bold text-foreground">Dados privados</p>
          <p className="mt-1">
            Telefone, nascimento, preferências, check-ins e histórico de mimos não aparecem para
            outros usuários.
          </p>
          <p className="mt-2">
            Telefone verificado:{" "}
            {profile?.phone_verified_at ? "sim" : "será ativado no lançamento com OTP"}.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-2xl border border-input bg-surface px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <input
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
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-2 text-xs font-bold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground"}`}
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
    <label className="flex items-start gap-3">
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
