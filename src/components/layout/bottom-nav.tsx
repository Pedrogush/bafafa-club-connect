import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessageCircleMore, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/inicio", label: "Início", icon: Home, active: "bg-mango" },
  { to: "/mimos", label: "Fofoquinhas", icon: Sparkles, active: "bg-secondary" },
  { to: "/resenha", label: "Resenha", icon: MessageCircleMore, active: "bg-samba" },
  { to: "/perfil", label: "Perfil", icon: UserRound, active: "bg-primary" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-background/97 pb-safe backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 items-center gap-1 px-2 py-2">
        {items.map(({ to, label, icon: Icon, active: activeColor }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "mx-auto flex min-h-14 w-full max-w-[96px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-1.5 text-[10px] font-extrabold transition",
                  active
                    ? `${activeColor} border-foreground text-foreground shadow-[2px_3px_0_var(--foreground)]`
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.7 : 2.1} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
