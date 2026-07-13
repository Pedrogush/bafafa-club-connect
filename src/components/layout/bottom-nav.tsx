import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessageCircleMore, CalendarCheck, Wallet, User, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/inicio", label: "Início", icon: Home, isCenter: false },
  { to: "/fofoquinhas", label: "Fofoquinhas", icon: MessageCircleMore, isCenter: false },
  { to: "/reservas", label: "Reservas", icon: CalendarCheck, isCenter: true },
  { to: "/carteira", label: "Carteira", icon: Wallet, isCenter: false },
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
              <li key={to} className="relative flex justify-center">
                <Link
                  to={to}
                  aria-label={label}
                  className={cn(
                    "-mt-8 grid h-16 w-16 place-items-center rounded-full border-4 border-background shadow-festa transition",
                    "bg-primary text-primary-foreground hover:scale-[1.03]",
                    active && "bg-samba"
                  )}
                >
                  <Icon className="h-7 w-7" strokeWidth={2.3} />
                </Link>
              </li>
            );
          }
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/10")} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function QrFloatingHint() {
  return (
    <Link
      to="/perfil"
      hash="qr"
      className="fixed bottom-24 right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-foreground text-background shadow-festa transition hover:scale-105 pb-safe"
      aria-label="Meu QR Code"
    >
      <QrCode className="h-5 w-5" />
    </Link>
  );
}
