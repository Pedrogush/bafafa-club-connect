import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { Wordmark } from "@/components/brand/wordmark";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminHome,
});

function AdminHome() {
  const { loading, roles } = useAuth();
  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }

  const allowed = hasRole(roles, "admin", "moderador", "equipe");
  if (!allowed) {
    return (
      <div className="mx-auto grid min-h-screen max-w-lg place-items-center bg-background px-6">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-2xl">Área restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Só administradores, moderadores e equipe do Bafafá entram por aqui.
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
  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-background px-6 py-8">
      <header className="flex items-center justify-between">
        <Wordmark variant="short" />
        <Link
          to="/inicio"
          className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Sair do painel
        </Link>
      </header>
      <h1 className="mt-8 font-display text-3xl">Painel administrativo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Papéis ativos: {roles.join(", ") || "nenhum"}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "Visão geral",
          "Clientes",
          "CRM",
          "Fofoquinhas",
          "Moderação",
          "Eventos",
          "Reservas",
          "Mesas e áreas",
          "Check-ins",
          "Planos",
          "Assinaturas",
          "Benefícios",
          "Pontos",
          "Conquistas",
          "Notificações",
          "Relatórios",
          "Equipe",
          "Configurações",
          "Auditoria",
        ].map((title) => (
          <div key={title} className="card-festa p-4">
            <p className="font-display text-lg leading-tight">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Módulo previsto para a Etapa 3.
            </p>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <p className="mt-8 rounded-2xl bg-muted p-4 text-xs text-muted-foreground">
          Você tem acesso operacional (equipe/moderação). Notas confidenciais do CRM só ficam visíveis para
          administradores.
        </p>
      )}
    </div>
  );
}
