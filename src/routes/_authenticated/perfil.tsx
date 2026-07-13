import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Perfil,
});

interface ProfileRow {
  display_name: string;
  username: string | null;
  city: string | null;
  bio: string | null;
  is_public: boolean;
}

function Perfil() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, username, city, bio, is_public")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as ProfileRow | null));
  }, [user]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const update = {
      display_name: (fd.get("display_name") as string).trim(),
      username: (fd.get("username") as string).trim() || null,
      city: (fd.get("city") as string).trim() || null,
      bio: (fd.get("bio") as string).trim() || null,
      is_public: fd.get("is_public") === "on",
    };
    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return toast.error(error.message);
    setProfile((p) => ({ ...(p ?? ({} as ProfileRow)), ...update }));
    toast.success("Perfil salvinho.");
  }

  const isPrivileged = roles.some((r) => r === "admin" || r === "moderador" || r === "equipe");
  const isPremium = roles.includes("premium");

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
        <section className="card-festa flex items-center gap-4 p-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-display text-xl">
            {(profile?.display_name?.[0] ?? "B").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg">{profile?.display_name ?? "Bafafã"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {profile?.username ? `@${profile.username}` : user?.email}
            </p>
            {isPremium && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-mango px-2 py-0.5 text-[10px] font-bold uppercase text-mango-foreground">
                <Sparkles className="h-3 w-3" /> Carteirinha
              </span>
            )}
          </div>
        </section>

        {isPrivileged && (
          <Link
            to="/admin"
            className="card-festa flex items-center gap-3 bg-foreground p-4 text-background"
          >
            <ShieldCheck className="h-5 w-5" />
            <div>
              <p className="font-display text-sm">Painel administrativo</p>
              <p className="text-xs opacity-70">Você tem acesso operacional.</p>
            </div>
          </Link>
        )}

        <form onSubmit={saveProfile} className="card-festa space-y-3 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Editar perfil
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Nome</span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              required
              className="w-full rounded-2xl border border-input bg-surface px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Usuário</span>
            <input
              name="username"
              defaultValue={profile?.username ?? ""}
              className="w-full rounded-2xl border border-input bg-surface px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Cidade</span>
            <input
              name="city"
              defaultValue={profile?.city ?? ""}
              className="w-full rounded-2xl border border-input bg-surface px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Bio curta</span>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              rows={3}
              className="w-full rounded-2xl border border-input bg-surface px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="is_public"
              type="checkbox"
              defaultChecked={profile?.is_public ?? true}
              className="h-4 w-4 accent-primary"
            />
            Perfil visível pra outros Bafafãs
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-festa"
          >
            Salvar
          </button>
        </form>

        <div id="qr" className="card-festa p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Meu QR Code
          </p>
          <div className="mx-auto mt-3 grid h-40 w-40 place-items-center rounded-2xl border-2 border-dashed border-border text-xs text-muted-foreground">
            Chega na Etapa 2
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Vai identificar você no bar, validar reservas e resgatar benefícios.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
