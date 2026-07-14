import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, LockKeyhole, MapPin, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import {
  BadgeSticker,
  NameWithBadges,
  type BafafaBadgeDefinition,
} from "@/components/profile/bafafa-badge";
import { supabase } from "@/integrations/supabase/client";

type PublicProfile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  member_since: string;
  active_title: string | null;
  badges: BafafaBadgeDefinition[];
};

export const Route = createFileRoute("/u/$username")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.rpc("get_public_profile", { _username: username }).then(({ data }) => {
      if (!mounted) return;
      setProfile((data as PublicProfile | null) ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [username]);

  return (
    <div className="app-canvas min-h-screen px-4 py-6">
      <main className="mx-auto max-w-lg">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Wordmark variant="short" />
          <Link
            to="/"
            className="rounded-xl border-2 border-foreground bg-background px-3 py-2 text-xs font-black shadow-[2px_3px_0_var(--foreground)]"
          >
            Entrar no clube
          </Link>
        </div>

        {loading ? (
          <div className="card-festa p-8 text-center text-sm font-bold text-muted-foreground">
            Procurando essa figurinha…
          </div>
        ) : !profile ? (
          <section className="poster-card checker-texture p-6 text-foreground">
            <span className="cut-label bg-white">perfil fechado</span>
            <LockKeyhole className="mt-5 h-8 w-8" />
            <h1 className="mt-3 font-display text-4xl leading-none">Essa figurinha não está no álbum público.</h1>
            <p className="mt-3 text-sm font-semibold opacity-70">
              O perfil pode estar privado, sem nome de usuário ou ter mudado de endereço.
            </p>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="poster-card overflow-hidden bg-card">
              <div className="brick-texture h-28 border-b-[3px] border-foreground" />
              <div className="relative px-5 pb-6">
                <div className="-mt-14 grid h-28 w-28 place-items-center overflow-hidden rounded-full border-[4px] border-foreground bg-primary font-display text-5xl text-primary-foreground shadow-[4px_5px_0_var(--foreground)]">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profile.display_name[0]?.toUpperCase() ?? "B"
                  )}
                </div>
                <div className="mt-5">
                  <NameWithBadges
                    name={profile.display_name}
                    badges={profile.badges ?? []}
                    className="font-poster text-3xl"
                  />
                  <p className="mt-1 text-sm font-bold text-muted-foreground">@{profile.username}</p>
                  {profile.active_title && (
                    <span className="cut-label mt-3 bg-foreground text-background">
                      {profile.active_title}
                    </span>
                  )}
                  {profile.bio && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>}
                  <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-muted-foreground">
                    {profile.city && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-brick" /> {profile.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" /> No clube desde {new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(profile.member_since))}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="sticker-card bg-card p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-samba" />
                <h2 className="font-display text-2xl">Selos à mostra</h2>
              </div>
              {profile.badges?.length ? (
                <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
                  {profile.badges.map((badge) => (
                    <BadgeSticker key={`${badge.slug}-${badge.name}`} badge={badge} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold text-muted-foreground">
                  Essa pessoa ainda está começando a coleção.
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
