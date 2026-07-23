import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MapPin, MessageCircleMore, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/inicio" });
  },
  component: LandingPage,
});

const HIGHLIGHTS = [
  { icon: MapPin, label: "Check-in no Bafafá" },
  { icon: Sparkles, label: "Fofoquinhas e benefícios" },
  { icon: MessageCircleMore, label: "Resenha da comunidade" },
];

function LandingPage() {
  return (
    <main className="app-canvas relative mx-auto flex min-h-screen max-w-lg flex-col overflow-hidden bg-background px-5 pb-8 pt-8 sm:px-7">
      <div className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-mango/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-24 h-64 w-64 rounded-full bg-lagoa/25 blur-3xl" />

      <header className="relative flex items-center justify-between">
        <div className="rotate-[-2deg] rounded-2xl border-2 border-foreground bg-primary px-4 py-3 text-primary-foreground shadow-[4px_5px_0_var(--foreground)]">
          <Wordmark tone="white" />
        </div>
        <span className="rounded-full border-2 border-foreground/15 bg-card px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Clube do Bafafã
        </span>
      </header>

      <section className="relative flex flex-1 flex-col justify-center py-10">
        <p className="section-kicker text-primary">A resenha começa aqui</p>
        <h1 className="mt-3 max-w-md font-display text-5xl leading-[0.96] tracking-tight sm:text-6xl">
          O Bafafá começa antes de você chegar.
        </h1>
        <p className="mt-5 max-w-md text-base font-semibold leading-relaxed text-muted-foreground">
          Faça check-in, descubra Fofoquinhas e acompanhe o que está rolando no bar, tudo pelo celular.
        </p>

        <div className="mt-7 grid gap-2.5">
          {HIGHLIGHTS.map(({ icon: Icon, label }, index) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border-2 border-foreground/10 bg-card/90 px-4 py-3 shadow-sm backdrop-blur"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-foreground ${
                  index === 0
                    ? "bg-primary text-primary-foreground"
                    : index === 1
                      ? "bg-mango text-mango-foreground"
                      : "bg-samba text-samba-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-black">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-foreground bg-primary px-6 text-base font-black text-primary-foreground shadow-[4px_5px_0_var(--foreground)] transition active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Entrar no Clube
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-black underline decoration-2 underline-offset-4"
          >
            Já tenho cadastro
          </Link>
        </div>
      </section>

      <footer className="relative border-t border-foreground/10 pt-5 text-center text-xs text-muted-foreground">
        <p>Cadastro gratuito para maiores de 18 anos.</p>
        <p className="mt-2">
          <Link to="/privacidade" hash="termos" className="font-bold underline underline-offset-4">
            Termos de Uso
          </Link>
          <span aria-hidden> · </span>
          <Link to="/privacidade" hash="privacidade" className="font-bold underline underline-offset-4">
            Privacidade
          </Link>
          <span aria-hidden> · </span>
          <Link to="/privacidade" hash="comunidade" className="font-bold underline underline-offset-4">
            Regras da Comunidade
          </Link>
        </p>
        <p className="mt-3">Bafafá Bar — Natal/RN · © {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
