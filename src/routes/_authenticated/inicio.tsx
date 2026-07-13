import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/layout/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: Inicio,
});

function Inicio() {
  const { user, roles } = useAuth();
  const isPremium = roles.includes("premium");
  const firstName = (user?.user_metadata?.display_name as string | undefined)?.split(" ")[0] ?? "Bafafã";

  return (
    <AppShell>
      <ScreenHeader
        eyebrow="Olá, Bafafã"
        title={
          <>
            Ô, {firstName}!<span className="text-samba">.</span>
          </>
        }
      />

      <div className="space-y-4 px-5">
        <section className="card-festa relative overflow-hidden bg-primary p-5 text-primary-foreground">
          <div className="absolute inset-0 bg-confete opacity-30" aria-hidden />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Próximo bafafá</p>
            <h2 className="mt-2 font-display text-2xl leading-tight">
              Em breve: a agenda vai encher essa tela.
            </h2>
            <p className="mt-2 text-sm opacity-90">
              A gente tá terminando de organizar o calendário. Assim que estiver de pé, o próximo pagode
              aparece bem aqui.
            </p>
          </div>
        </section>

        <section className="card-festa flex items-center gap-4 p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mango text-mango-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Seu plano
            </p>
            <p className="mt-0.5 font-display text-lg">
              {isPremium ? "Bafafã de Carteirinha" : "Bafafã Gratuito"}
            </p>
            {!isPremium && (
              <p className="mt-1 text-sm text-muted-foreground">
                Dá pra virar de Carteirinha e destravar prioridade e benefícios mensais.
              </p>
            )}
          </div>
        </section>

        <section className="card-festa flex items-center gap-4 p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-samba text-samba-foreground">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Fofoquinhas
            </p>
            <p className="mt-0.5 font-display text-lg">Tá quentinho, quentinho.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O feed do clube abre na próxima etapa. Segura o coração.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
