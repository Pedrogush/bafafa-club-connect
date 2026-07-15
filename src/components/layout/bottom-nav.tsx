import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, MessageCircleMore, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/eventos", label: "Eventos", icon: CalendarDays, isCenter: false, active: "bg-lagoa" },
  { to: "/mimos", label: "Fofoquinhas", icon: Sparkles, isCenter: false, active: "bg-secondary" },
  { to: "/inicio", label: "Início", icon: Home, isCenter: true, active: "bg-mango" },
  {
    to: "/resenha",
    label: "Resenha",
    icon: MessageCircleMore,
    isCenter: false,
    active: "bg-samba",
  },
  { to: "/perfil", label: "Perfil", icon: UserRound, isCenter: false, active: "bg-primary" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-background/97 backdrop-blur pb-safe"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-2">
        {items.map(({ to, label, icon: Icon, isCenter, active: activeColor }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          if (isCenter) {
            return (
              <li key={to} className="relative flex min-h-14 justify-center">
                <Link
                  to={to}
                  aria-label={label}
                  className="group absolute -top-9 flex flex-col items-center"
                >
                  <span
                    className={cn(
                      "grid h-17 w-17 rotate-[-3deg] place-items-center rounded-full border-[3px] border-foreground bg-mango text-foreground shadow-[4px_5px_0_var(--foreground)] transition group-hover:rotate-0 group-hover:scale-[1.03]",
                      active && activeColor,
                    )}
                  >
                    <Icon className="h-7 w-7" strokeWidth={2.7} />
                  </span>
                  <span
                    className={cn(
                      "mt-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                      active ? "bg-foreground text-background" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "mx-auto flex w-[72px] flex-col items-center gap-0.5 rounded-2xl border-2 px-1 py-1.5 text-[10px] font-extrabold transition",
                  active
                    ? `${activeColor} border-foreground text-foreground shadow-[2px_3px_0_var(--foreground)]`
                    : "border-transparent text-muted-foreground hover:text-foreground",
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
