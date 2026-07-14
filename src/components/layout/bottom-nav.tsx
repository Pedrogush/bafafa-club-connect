import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Gift, Home, QrCode, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/inicio", label: "Início", icon: Home, isCenter: false },
  { to: "/eventos", label: "Eventos", icon: CalendarDays, isCenter: false },
  { to: "/checkin", label: "Check-in", icon: QrCode, isCenter: true },
  { to: "/mimos", label: "Mimos", icon: Gift, isCenter: false },
  { to: "/perfil", label: "Perfil", icon: User, isCenter: false },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-safe"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-2">
        {items.map(({ to, label, icon: Icon, isCenter }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          if (isCenter) {
            return (
              <li key={to} className="relative flex min-h-14 justify-center">
                <Link
                  to={to}
                  aria-label={label}
                  className="group absolute -top-8 flex flex-col items-center"
                >
                  <span
                    className={cn(
                      "grid h-16 w-16 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-festa transition group-hover:scale-[1.03]",
                      active && "bg-samba",
                    )}
                  >
                    <Icon className="h-7 w-7" strokeWidth={2.3} />
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-[11px] font-bold",
                      active ? "text-primary" : "text-muted-foreground",
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
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "fill-primary/10")}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
