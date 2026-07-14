import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { Wordmark } from "@/components/brand/wordmark";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Gift,
  Medal,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminHome,
});

function AdminHome() {
  const { loading, roles } = useAuth();
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  const allowed = hasRole(roles, "admin", "moderador", "equipe");
  if (!allowed) {
    return (
      <div className="mx-auto grid min-h-screen max-w-lg place-items-center bg-background px-6">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-2xl">Área restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Só administradores e equipe autorizada entram por aqui.
          </p>
          <Link
            to="/inicio"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-festa"
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = roles.includes("admin");
  const modules = [
    { title: "Visão geral", copy: "Cadastros, perfil, check-ins e mimos.", icon: BarChart3 },
    { title: "Eventos", copy: "Agenda e janelas de check-in.", icon: CalendarDays },
    { title: "Campanhas", copy: "Promoções e regras de liberação.", icon: Gift },
    { title: "Clientes", copy: "Perfis e dados declarados.", icon: Users },
    {
      title: "Check-ins",
      copy: "Presenças por evento.",
      icon: CheckCircle2,
      to: "/staff/checkin" as const,
    },
    { title: "Selos e títulos", copy: "Regras de gamificação.", icon: Medal },
    { title: "Configurações", copy: "Recursos ativos e equipe.", icon: Settings },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-background px-6 py-8">
      <header className="flex items-center justify-between gap-3">
        <Wordmark variant="short" />
        <Link
          to="/inicio"
          className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Sair do painel
        </Link>
      </header>
      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        MVP simplificado
      </p>
      <h1 className="mt-1 font-display text-3xl">Administração</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Papéis ativos: {roles.join(", ") || "nenhum"}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ title, copy, icon: Icon, to }) => {
          const card = (
            <div className="card-festa h-full p-5">
              <Icon className="h-6 w-6 text-primary" />
              <p className="mt-4 font-display text-lg leading-tight">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
              {!to && (
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  CRUD entra no próximo pacote
                </p>
              )}
            </div>
          );
          return to ? (
            <Link key={title} to={to}>
              {card}
            </Link>
          ) : (
            <div key={title}>{card}</div>
          );
        })}
      </div>

      {!isAdmin && (
        <p className="mt-8 rounded-2xl bg-muted p-4 text-xs text-muted-foreground">
          Seu acesso é operacional. Exportação, papéis e dados completos permanecem restritos ao
          administrador.
        </p>
      )}
    </div>
  );
}
